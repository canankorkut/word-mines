import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import {
  joinGame,
  surrenderGame,
  GameData,
} from '../services/gameService';
import {getCurrentUser} from '../services/authService';
import {
  boardMapToArray,
  getLetterPoints,
  BoardMap,
} from '../services/gameUtils';

type GameScreenRouteProp = RouteProp<
  {
    Game: {gameId: string; timeLimit: string};
  },
  'Game'
>;

interface Cell {
  letter: string | null;
  row: number;
  col: number;
  isSelected: boolean;
  isLocked: boolean;
  isSpecial: string | null; // 'DL', 'TL', 'DW', 'TW', 'STAR'
}

interface CurrentWordLetter {
  letter: string;
  row: number;
  col: number;
  isNew: boolean;
}

interface MinePosition {
  row: number;
  col: number;
  type:
    | 'pointDivision'
    | 'pointTransfer'
    | 'letterLoss'
    | 'bonusCancellation'
    | 'wordCancellation';
}

interface RewardPosition {
  row: number;
  col: number;
  type: 'regionRestriction' | 'letterRestriction' | 'extraMove';
}

const GameScreen = () => {
  const route = useRoute<GameScreenRouteProp>();
  const {gameId, timeLimit} = route.params;
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameData | null>(null);
  const [board, setBoard] = useState<Cell[][]>([]);
  const [playerLetters, setPlayerLetters] = useState<string[]>([]);
  const [selectedLetterIndex, setSelectedLetterIndex] = useState<number | null>(
    null,
  );
  const [currentWord, setCurrentWord] = useState<CurrentWordLetter[]>([]);
  const [currentWordIsValid, setCurrentWordIsValid] = useState<boolean | null>(
    null,
  );
  const [currentWordScore, setCurrentWordScore] = useState(0);
  const [selectedBoardCell, setSelectedBoardCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [playerBonuses, setPlayerBonuses] = useState<string[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [wordList, setWordList] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isFirstMove, setIsFirstMove] = useState(false);
  const [cellValidationColors, setCellValidationColors] = useState<{
    [key: string]: 'valid' | 'invalid' | null;
  }>({});
  const gameRef = useRef<FirebaseFirestoreTypes.DocumentReference | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const firebaseUnsubscribeRef = useRef<(() => void) | null>(null);
  const [completedWordScores, setCompletedWordScores] = useState<{
    [key: string]: number;
  }>({});
  const [minePositions, setMinePositions] = useState<MinePosition[]>([]);
  const [rewardPositions, setRewardPositions] = useState<RewardPosition[]>([]);
  const [restrictedRegion, setRestrictedRegion] = useState<
    'left' | 'right' | null
  >(null);
  const [frozenLetters, setFrozenLetters] = useState<number[]>([]);
  const [hasExtraMove, setHasExtraMove] = useState(false);

  useEffect(() => {
    const loadGame = async () => {
      try {
        setLoading(true);
        const user = await getCurrentUser();
        if (!user || !user.uid) {
          Alert.alert('Hata', 'Kullanıcı bilgileri bulunamadı');
          navigation.goBack();
          return;
        }

        setUserId(user.uid);

        const gameData = await joinGame(gameId);
        setGame(gameData);

        const firestoreGameRef = firestore().collection('games').doc(gameId);
        gameRef.current = firestoreGameRef;

        initializeBoard(gameData.board);

        const isPlayer1 = gameData.player1Id === user.uid;
        setPlayerLetters(
          isPlayer1 ? gameData.player1Letters : gameData.player2Letters,
        );
        setPlayerBonuses(
          isPlayer1 ? gameData.player1Bonuses : gameData.player2Bonuses,
        );

        const initialFrozenLetters = isPlayer1
          ? gameData.player1FrozenLetters || []
          : gameData.player2FrozenLetters || [];
        setFrozenLetters(initialFrozenLetters);

        setRestrictedRegion(gameData.restrictedRegion || null);

        const currentTurn = gameData.currentTurn;
        const isMyTurn =
          (isPlayer1 && currentTurn === 'player1') ||
          (!isPlayer1 && currentTurn === 'player2');
        setIsPlayerTurn(isMyTurn);

        if (isMyTurn && gameData.lastMoveTime) {
          startTurnTimer(gameData);
        }

        const boardIsEmpty =
          !gameData.board || Object.keys(gameData.board).length === 0;
        setIsFirstMove(boardIsEmpty);

        loadWordList();
        generateMinesAndRewards();

        setupGameListener(firestoreGameRef, user.uid);

        setLoading(false);
      } catch (error) {
        console.error('Error loading game:', error);
        Alert.alert('Hata', 'Oyun yüklenirken bir hata oluştu');
        navigation.goBack();
      }
    };

    loadGame();

    return () => {
      cleanupTimers();
      if (firebaseUnsubscribeRef.current) {
        firebaseUnsubscribeRef.current();
      }
    };
  }, [gameId, navigation]);

  const setupGameListener = (
    gameDocRef: FirebaseFirestoreTypes.DocumentReference,
    currentUserId: string,
  ) => {
    if (firebaseUnsubscribeRef.current) {
      firebaseUnsubscribeRef.current();
    }

    const unsubscribe = gameDocRef.onSnapshot(
      snapshot => {
        const data = snapshot.data() as GameData;
        if (!data) return;

        console.log('Real-time update received:', data);

        setGame(data);

        if (data.board) {
          initializeBoard(data.board);

          const hasAnyLetter = Object.values(data.board).some(
            cell => cell !== null,
          );
          setIsFirstMove(!hasAnyLetter);
        }

        const boardIsEmpty =
          !data.board || Object.keys(data.board).length === 0;
        setIsFirstMove(boardIsEmpty);

        const isPlayer1 = data.player1Id === currentUserId;
        setPlayerLetters(isPlayer1 ? data.player1Letters : data.player2Letters);
        setPlayerBonuses(isPlayer1 ? data.player1Bonuses : data.player2Bonuses);

        const currentPlayerFrozenLetters = isPlayer1
          ? data.player1FrozenLetters || []
          : data.player2FrozenLetters || [];
        setFrozenLetters(currentPlayerFrozenLetters);

        if (data.restrictedRegion && data.restrictedRegionTarget) {
          const playerIdentifier = isPlayer1 ? 'player1' : 'player2';
          if (data.restrictedRegionTarget === playerIdentifier) {
            setRestrictedRegion(data.restrictedRegion);
          } else {
            setRestrictedRegion(null);
          }
        } else {
          setRestrictedRegion(null);
        }

        const currentTurn = data.currentTurn;
        const isMyTurn =
          (isPlayer1 && currentTurn === 'player1') ||
          (!isPlayer1 && currentTurn === 'player2');
        setIsPlayerTurn(isMyTurn);

        resetTimerIfNewTurn(data, isMyTurn);

        if (data.status === 'completed') {
          const playerWon =
            (isPlayer1 && data.winner === 'player1') ||
            (!isPlayer1 && data.winner === 'player2');

          Alert.alert(
            'Oyun Bitti',
            playerWon
              ? 'Tebrikler! Oyunu kazandınız!'
              : 'Üzgünüz, oyunu kaybettiniz.',
            [{text: 'Tamam', onPress: () => navigation.goBack()}],
          );
        }
      },
      error => {
        console.error('Game snapshot error:', error);
        Alert.alert('Hata', 'Oyun verilerini izlerken bir hata oluştu');
      },
    );

    firebaseUnsubscribeRef.current = unsubscribe;
  };

  const resetTimerIfNewTurn = (gameData: GameData, isMyTurn: boolean) => {
    cleanupTimers();

    if (isMyTurn && gameData.lastMoveTime) {
      startTurnTimer(gameData);
    } else {
      setRemainingTime(null);
    }
  };

  const cleanupTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTurnTimer = (gameData: GameData) => {
    if (!gameData || !gameData.lastMoveTime) return;

    const timeLimitValue = gameData.timeLimit;

    let timeInMs = 0;

    switch (timeLimitValue) {
      case '2-dakika':
        timeInMs = 2 * 60 * 1000;
        break;
      case '5-dakika':
        timeInMs = 5 * 60 * 1000;
        break;
      case '12-saat':
        timeInMs = 12 * 60 * 60 * 1000;
        break;
      case '24-saat':
        timeInMs = 24 * 60 * 60 * 1000;
        break;
      default:
        timeInMs = 5 * 60 * 1000;
    }

    let lastMoveTime: number;

    if (typeof gameData.lastMoveTime.toDate === 'function') {
      lastMoveTime = gameData.lastMoveTime.toDate().getTime();
    } else if (gameData.lastMoveTime instanceof Date) {
      lastMoveTime = gameData.lastMoveTime.getTime();
    } else {
      lastMoveTime = Number(gameData.lastMoveTime);
    }

    const expiryTime = lastMoveTime + timeInMs;
    const now = Date.now();

    const initialRemainingTime = Math.max(0, (expiryTime - now) / 1000);
    setRemainingTime(initialRemainingTime);

    console.log('Starting timer with', initialRemainingTime, 'seconds');

    timerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev === null || prev <= 0) {
          cleanupTimers();
          if (gameRef.current && userId) {
            surrenderGame(gameId, userId);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const loadWordList = async () => {
    try {
      const response = await fetch(
        'https://raw.githubusercontent.com/CanNuhlar/Turkce-Kelime-Listesi/master/turkce_kelime_listesi.txt',
      );
      const text = await response.text();
      const words = text.split('\n').map(word => word.trim().toUpperCase());
      setWordList(words);
    } catch (error) {
      console.error('Error loading word list:', error);
      setWordList([
        'ARABA',
        'KITAP',
        'KALEM',
        'EV',
        'OKUL',
        'MASA',
        'SANDALYE',
        'ÖN',
        'KOŞ',
      ]);
    }
  };

  const initializeBoard = (boardMap: BoardMap) => {
    const boardArray = boardMapToArray(boardMap);
    const cellsArray: Cell[][] = Array(15)
      .fill(null)
      .map(() => Array(15).fill(null));

    let hasAnyLetter = false;

    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        const letter = boardArray[row][col];
        if (letter !== null) {
          hasAnyLetter = true;
        }

        cellsArray[row][col] = {
          letter: letter,
          row,
          col,
          isSelected: false,
          isLocked: letter !== null,
          isSpecial: getSpecialCellType(row, col),
        };
      }
    }

    setIsFirstMove(!hasAnyLetter);
    setBoard(cellsArray);
  };

  const getSpecialCellType = (row: number, col: number): string | null => {
    if (row === 7 && col === 7) return 'STAR';

    const dlPositions = [
      '0,5',
      '0,9',
      '1,6',
      '1,8',
      '5,0',
      '5,5',
      '5,9',
      '5,14',
      '6,1',
      '6,6',
      '6,8',
      '6,13',
      '8,1',
      '8,6',
      '8,8',
      '8,13',
      '9,0',
      '9,5',
      '9,9',
      '9,14',
      '13,6',
      '13,8',
      '14,5',
      '14,9',
    ];

    const tlPositions = [
      '1,1',
      '1,13',
      '4,4',
      '4,10',
      '10,4',
      '10,10',
      '13,1',
      '13,13',
    ];

    const dwPositions = [
      '2,7',
      '3,3',
      '3,11',
      '7,2',
      '7,12',
      '11,3',
      '11,11',
      '12,7',
    ];

    const twPositions = [
      '0,2',
      '0,12',
      '2,0',
      '2,14',
      '12,0',
      '12,14',
      '14,2',
      '14,12',
    ];

    const pos = `${row},${col}`;

    if (dlPositions.includes(pos)) return 'DL';
    if (tlPositions.includes(pos)) return 'TL';
    if (dwPositions.includes(pos)) return 'DW';
    if (twPositions.includes(pos)) return 'TW';

    return null;
  };

  const handleLetterSelect = (index: number) => {
    if (!isPlayerTurn) {
      Alert.alert('Uyarı', 'Şu anda sıra sizde değil.');
      return;
    }

    if (frozenLetters.includes(index)) {
      Alert.alert('Uyarı', 'Bu harf dondurulmuş, kullanılamaz!');
      return;
    }

    setSelectedLetterIndex(index === selectedLetterIndex ? null : index);
  };

  const handleCellSelect = (row: number, col: number) => {
    if (!isPlayerTurn) {
      Alert.alert('Uyarı', 'Şu anda sıra sizde değil.');
      return;
    }

    if (game?.restrictedRegion && game?.restrictedRegionTarget) {
      const isPlayer1 = game.player1Id === userId;
      const playerIdentifier = isPlayer1 ? 'player1' : 'player2';

      if (game.restrictedRegionTarget === playerIdentifier) {
        const isLeftSide = col < 7;
        const isRightSide = col > 7;

        if (game.restrictedRegion === 'left' && isLeftSide) {
          Alert.alert('Uyarı', 'Bu bölgeye harf koyamazsınız!');
          return;
        }
        if (game.restrictedRegion === 'right' && isRightSide) {
          Alert.alert('Uyarı', 'Bu bölgeye harf koyamazsınız!');
          return;
        }
      }
    }

    if (board[row][col].isSelected && board[row][col].letter) {
      if (selectedLetterIndex !== null) {
        const oldLetter = board[row][col].letter;
        const newLetter = playerLetters[selectedLetterIndex];

        const newPlayerLetters = [...playerLetters];
        newPlayerLetters.splice(selectedLetterIndex, 1);
        newPlayerLetters.push(oldLetter);
        setPlayerLetters(newPlayerLetters);

        const updatedWord = currentWord.map(letter =>
          letter.row === row && letter.col === col
            ? {...letter, letter: newLetter}
            : letter,
        );
        setCurrentWord(updatedWord);

        const newBoard = [...board];
        newBoard[row][col] = {
          ...newBoard[row][col],
          letter: newLetter,
          isSelected: true,
        };
        setBoard(newBoard);

        calculateWordScore(updatedWord);

        if (updatedWord.length >= 2) {
          validateWord(updatedWord.map(l => l.letter).join(''));
        }

        setSelectedLetterIndex(null);
        return;
      }

      const letterToReturn = board[row][col].letter;

      setPlayerLetters(prev => [...prev, letterToReturn]);

      const updatedWord = currentWord.filter(
        letter => !(letter.row === row && letter.col === col),
      );
      setCurrentWord(updatedWord);

      const newBoard = [...board];
      newBoard[row][col] = {
        ...newBoard[row][col],
        letter: null,
        isSelected: false,
      };
      setBoard(newBoard);

      calculateWordScore(updatedWord);

      if (updatedWord.length >= 2) {
        validateWord(updatedWord.map(l => l.letter).join(''));
      } else {
        setCellValidationColors({});
        setCurrentWordIsValid(null);
      }

      return;
    }

    if (board[row][col].isLocked) {
      Alert.alert('Uyarı', 'Bu hücre zaten dolu.');
      return;
    }

    if (selectedLetterIndex !== null) {
      const newBoard = [...board];

      newBoard[row][col] = {
        ...newBoard[row][col],
        letter: playerLetters[selectedLetterIndex],
        isSelected: true,
      };

      const updatedWord = [
        ...currentWord,
        {
          letter: playerLetters[selectedLetterIndex],
          row,
          col,
          isNew: true,
          letterIndex: selectedLetterIndex,
        },
      ];

      setCurrentWord(updatedWord);
      setBoard(newBoard);

      const newPlayerLetters = [...playerLetters];
      newPlayerLetters.splice(selectedLetterIndex, 1);
      setPlayerLetters(newPlayerLetters);

      calculateWordScore(updatedWord);

      if (updatedWord.length >= 2) {
        validateWord(updatedWord.map(l => l.letter).join(''));
      } else {
        setCellValidationColors({});
      }

      setSelectedLetterIndex(null);
    } else {
      setSelectedBoardCell({row, col});
    }
  };

  const calculateWordScore = (word: CurrentWordLetter[]) => {
    let score = 0;
    let wordMultiplier = 1;

    word.forEach(({letter, row, col, isNew}) => {
      if (!isNew) return;

      let letterScore = getLetterPoints(letter);
      const specialCell = getSpecialCellType(row, col);

      if (specialCell === 'DL') letterScore *= 2;
      if (specialCell === 'TL') letterScore *= 3;

      if (specialCell === 'DW') wordMultiplier *= 2;
      if (specialCell === 'TW') wordMultiplier *= 3;

      score += letterScore;
    });

    score *= wordMultiplier;

    setCurrentWordScore(score);
    return score;
  };

  const isWordContiguous = () => {
    if (currentWord.length <= 1) return true;

    const sortedLetters = [...currentWord].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });

    let isHorizontal = true;
    const firstRow = sortedLetters[0].row;
    for (let i = 1; i < sortedLetters.length; i++) {
      if (sortedLetters[i].row !== firstRow) {
        isHorizontal = false;
        break;
      }
      if (sortedLetters[i].col !== sortedLetters[i - 1].col + 1) {
        isHorizontal = false;
        break;
      }
    }

    if (isHorizontal) return true;

    let isVertical = true;
    const firstCol = sortedLetters[0].col;
    for (let i = 1; i < sortedLetters.length; i++) {
      if (sortedLetters[i].col !== firstCol) {
        isVertical = false;
        break;
      }
      if (sortedLetters[i].row !== sortedLetters[i - 1].row + 1) {
        isVertical = false;
        break;
      }
    }

    return isVertical;
  };

  const validateWord = (word: string) => {
    if (!isWordContiguous()) {
      setCurrentWordIsValid(false);
      const colors: {[key: string]: 'valid' | 'invalid' | null} = {};
      currentWord.forEach(({row, col}) => {
        const key = `${row}-${col}`;
        colors[key] = 'invalid';
      });
      setCellValidationColors(colors);
      return false;
    }

    const isValid = wordList.includes(word.toUpperCase());
    setCurrentWordIsValid(isValid);
    const colors: {[key: string]: 'valid' | 'invalid' | null} = {};
    currentWord.forEach(({row, col}) => {
      const key = `${row}-${col}`;
      colors[key] = isValid ? 'valid' : 'invalid';
    });
    setCellValidationColors(colors);

    return isValid;
  };

  const isWordPassingThroughCenter = () => {
    return currentWord.some(letter => letter.row === 7 && letter.col === 7);
  };

  const validateFirstMove = () => {
    if (!isFirstMove) return true;

    if (!isWordPassingThroughCenter()) {
      return false;
    }

    if (currentWord.length < 2) {
      return false;
    }

    return true;
  };

  const handleSubmitWord = async () => {
    if (!isPlayerTurn) {
      Alert.alert('Uyarı', 'Şu anda sıra sizde değil.');
      return;
    }

    if (currentWord.length === 0) {
      Alert.alert('Uyarı', 'Lütfen bir kelime oluşturun.');
      return;
    }

    if (!isWordContiguous()) {
      Alert.alert('Geçersiz Kelime', 'Harfler yan yana olmalıdır.');
      return;
    }

    if (isFirstMove && !isWordPassingThroughCenter()) {
      Alert.alert(
        'Uyarı',
        'İlk kelime merkezdeki yıldız işaretinden geçmelidir.',
      );
      const lettersToReturn = currentWord.map(letter => letter.letter);
      setPlayerLetters([...playerLetters, ...lettersToReturn]);

      const newBoard = [...board];
      currentWord.forEach(({row, col}) => {
        newBoard[row][col] = {
          ...newBoard[row][col],
          letter: null,
          isSelected: false,
        };
      });

      setBoard(newBoard);
      setCurrentWord([]);
      setCurrentWordScore(0);
      setCurrentWordIsValid(null);
      setCellValidationColors({});
      return;
    }

    const word = currentWord.map(l => l.letter).join('');
    const isValid = validateWord(word);

    if (!isValid) {
      Alert.alert('Geçersiz Kelime', 'Lütfen geçerli bir kelime oluşturun.');
      return;
    }

    try {
      if (!userId || !game || !gameRef.current) return;

      const isPlayer1 = game.player1Id === userId;
      const playerField = isPlayer1 ? 'player1' : 'player2';

      const updatedBoard: BoardMap = {...game.board};
      currentWord.forEach(({row, col, letter}) => {
        if (letter) {
          updatedBoard[`${row},${col}`] = letter;
        }
      });

      let finalScore = currentWordScore;
      let hitMine = false;
      let hitReward = false;
      let letterRefreshNeeded = false;
      let transferPoints = 0;
      let newPlayerBonuses = [...playerBonuses];

      for (const {row, col} of currentWord) {
        const mineResult = checkForMineOrReward(row, col);

        if (mineResult?.type === 'mine') {
          hitMine = true;
          const mine = mineResult.data as MinePosition;

          switch (mine.type) {
            case 'pointDivision':
              finalScore = Math.floor(currentWordScore * 0.3);
              Alert.alert(
                'Mayın!',
                "Puan Bölünmesi - Puanınızın sadece %30'unu alabilirsiniz.",
              );
              break;

            case 'pointTransfer':
              transferPoints = currentWordScore;
              finalScore = 0;
              Alert.alert(
                'Mayın!',
                'Puan Transferi - Kazandığınız puan rakibinize gider.',
              );
              break;

            case 'bonusCancellation':
              finalScore = currentWord
                .filter(l => l.isNew)
                .reduce((total, l) => total + getLetterPoints(l.letter), 0);
              Alert.alert(
                'Mayın!',
                'Ekstra Hamle Engeli - Harf ve kelime katları iptal edildi.',
              );
              break;

            case 'wordCancellation':
              finalScore = 0;
              Alert.alert(
                'Mayın!',
                'Kelime İptali - Bu kelimeden puan alamazsınız.',
              );
              break;
          }
          break;
        }

        if (mineResult?.type === 'reward') {
          hitReward = true;
          const reward = mineResult.data as RewardPosition;

          if (!newPlayerBonuses.includes(reward.type)) {
            newPlayerBonuses.push(reward.type);
            Alert.alert(
              'Ödül Kazandınız!',
              `${getRewardDescription(
                reward.type,
              )} ödülünü kazandınız! Bonus butonlarından kullanabilirsiniz.`,
            );
          }
        }
      }

      const wordKey = currentWord
        .map(({row, col}) => `${row}-${col}`)
        .join('|');

      setCompletedWordScores(prev => ({
        ...prev,
        [wordKey]: finalScore,
      }));

      setTimeout(() => {
        setCompletedWordScores(prev => {
          const newScores = {...prev};
          delete newScores[wordKey];
          return newScores;
        });
      }, 3000);

      let updateData: any = {
        board: updatedBoard,
        lastMoveTime: firestore.FieldValue.serverTimestamp(),
        [`${playerField}Bonuses`]: newPlayerBonuses,
      };

      if (finalScore > 0) {
        updateData[`${playerField}Score`] =
          firestore.FieldValue.increment(finalScore);
      }

      if (transferPoints > 0) {
        const opponentField = isPlayer1 ? 'player2' : 'player1';
        updateData[`${opponentField}Score`] =
          firestore.FieldValue.increment(transferPoints);
      }

      const hasExtraMoveBonus = hasExtraMove;

      if (hasExtraMoveBonus) {
        updateData.currentTurn = game.currentTurn;
        setHasExtraMove(false);

        const updatedBonuses = newPlayerBonuses.filter(b => b !== 'extraMove');
        updateData[`${playerField}Bonuses`] = updatedBonuses;
        newPlayerBonuses = updatedBonuses;

        Alert.alert(
          'Ekstra Hamle',
          'Ekstra hamle hakkınız kullanıldı. Tekrar oynayabilirsiniz!',
        );
      } else {
        updateData.currentTurn = isPlayer1 ? 'player2' : 'player1';
      }

      const neededLetters = 7 - playerLetters.length;
      if (neededLetters > 0 && game.remainingLetters.length > 0) {
        const newLettersToAdd = game.remainingLetters.slice(0, neededLetters);
        updateData[`${playerField}Letters`] = [
          ...playerLetters,
          ...newLettersToAdd,
        ];
        updateData.remainingLetters =
          game.remainingLetters.slice(neededLetters);
      } else {
        updateData[`${playerField}Letters`] = playerLetters;
      }

      updateData.gameLog = firestore.FieldValue.arrayUnion({
        playerId: userId,
        action: 'placedWord',
        word,
        score: finalScore,
        timestamp: new Date(),
        hitMine,
        hitReward,
      });

      const opponentField = isPlayer1 ? 'player2' : 'player1';
      if (game.frozenLetterTurns && game.frozenLetterTurns > 0) {
        const newTurns = game.frozenLetterTurns - 1;
        if (newTurns <= 0) {
          updateData[`${opponentField}FrozenLetters`] = [];
          updateData.frozenLetterTurns = 0;

          console.log('Donmuş harfler temizlendi - süre doldu');
        } else {
          updateData.frozenLetterTurns = newTurns;

          console.log('Donmuş harf tur sayısı azaldı:', newTurns);
        }
      }

      if (game.regionRestrictionTurns && game.regionRestrictionTurns > 0) {
        const newRegionTurns = game.regionRestrictionTurns - 1;
        if (newRegionTurns <= 0) {
          updateData.restrictedRegion = null;
          updateData.restrictedRegionTarget = null;
          updateData.regionRestrictionTurns = 0;

          console.log('Bölge kısıtlaması temizlendi - süre doldu');
        } else {
          updateData.regionRestrictionTurns = newRegionTurns;

          console.log('Bölge kısıtlaması tur sayısı azaldı:', newRegionTurns);
        }
      }

      await gameRef.current.update(updateData);

      setPlayerBonuses(newPlayerBonuses);
      setCurrentWord([]);
      setCurrentWordScore(0);
      setCurrentWordIsValid(null);
      setCellValidationColors({});
    } catch (error) {
      console.error('Error submitting word:', error);
      Alert.alert('Hata', 'Kelime gönderilirken bir hata oluştu');
    }
  };

  const handlePassTurn = async () => {
    if (!isPlayerTurn) {
      Alert.alert('Uyarı', 'Şu anda sıra sizde değil.');
      return;
    }

    try {
      if (!game || !gameRef.current || !userId) return;

      const isPlayer1 = game.player1Id === userId;
      const playerField = isPlayer1 ? 'player1' : 'player2';

      setCurrentWord([]);
      setCurrentWordScore(0);
      setCurrentWordIsValid(null);
      setCellValidationColors({});

      if (currentWord.length > 0) {
        const lettersToReturn = currentWord.map(letter => letter.letter);
        setPlayerLetters([...playerLetters, ...lettersToReturn]);

        const newBoard = [...board];
        currentWord.forEach(({row, col}) => {
          newBoard[row][col] = {
            ...newBoard[row][col],
            letter: null,
            isSelected: false,
          };
        });

        setBoard(newBoard);
      }

      const currentPlayerLetters = [...playerLetters];

      if (game.remainingLetters.length >= 7) {
        const newLetters = game.remainingLetters.slice(0, 7);
        const updatedRemainingLetters = [
          ...currentPlayerLetters,
          ...game.remainingLetters.slice(7),
        ];

        await gameRef.current.update({
          [`${playerField}Letters`]: newLetters,
          remainingLetters: updatedRemainingLetters,
          currentTurn: isPlayer1 ? 'player2' : 'player1',
          lastMoveTime: firestore.FieldValue.serverTimestamp(),
          gameLog: firestore.FieldValue.arrayUnion({
            playerId: userId,
            action: 'passTurn',
            timestamp: new Date(),
          }),
        });
      } else {
        const allAvailableLetters = [
          ...currentPlayerLetters,
          ...game.remainingLetters,
        ];

        for (let i = allAvailableLetters.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allAvailableLetters[i], allAvailableLetters[j]] = [
            allAvailableLetters[j],
            allAvailableLetters[i],
          ];
        }

        const newPlayerLetters = allAvailableLetters.slice(0, 7);
        const newRemainingLetters = allAvailableLetters.slice(7);

        await gameRef.current.update({
          [`${playerField}Letters`]: newPlayerLetters,
          remainingLetters: newRemainingLetters,
          currentTurn: isPlayer1 ? 'player2' : 'player1',
          lastMoveTime: firestore.FieldValue.serverTimestamp(),
          gameLog: firestore.FieldValue.arrayUnion({
            playerId: userId,
            action: 'passTurn',
            timestamp: new Date(),
          }),
        });
      }

      const gameLog = game.gameLog || [];
      if (gameLog.length >= 1) {
        const lastAction = gameLog[gameLog.length - 1];
        if (lastAction.action === 'passTurn') {
          endGame();
        }
      }
    } catch (error) {
      console.error('Error passing turn:', error);
      Alert.alert('Hata', 'Pas geçerken bir hata oluştu');
    }
  };

  const handleSurrender = async () => {
    Alert.alert('Teslim Ol', 'Oyunu teslim olmak istediğinize emin misiniz?', [
      {text: 'İptal', style: 'cancel'},
      {
        text: 'Teslim Ol',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!userId) return;
            await surrenderGame(gameId, userId);
            navigation.goBack();
          } catch (error) {
            console.error('Error surrendering:', error);
            Alert.alert('Hata', 'Teslim olurken bir hata oluştu');
          }
        },
      },
    ]);
  };

  const endGame = async () => {
    try {
      if (!game || !gameRef.current) return;

      let player1FinalScore = game.player1Score;
      let player2FinalScore = game.player2Score;

      if (game.player1Letters.length === 0) {
        const remainingPoints = game.player2Letters.reduce(
          (total, letter) => total + getLetterPoints(letter),
          0,
        );
        player1FinalScore += remainingPoints;
        player2FinalScore -= remainingPoints;
      } else if (game.player2Letters.length === 0) {
        const remainingPoints = game.player1Letters.reduce(
          (total, letter) => total + getLetterPoints(letter),
          0,
        );
        player2FinalScore += remainingPoints;
        player1FinalScore -= remainingPoints;
      }

      let winner = 'tie';
      if (player1FinalScore > player2FinalScore) {
        winner = 'player1';
      } else if (player2FinalScore > player1FinalScore) {
        winner = 'player2';
      }

      await gameRef.current.update({
        status: 'completed',
        player1Score: player1FinalScore,
        player2Score: player2FinalScore,
        winner,
        endedAt: firestore.FieldValue.serverTimestamp(),
        endReason: 'normal',
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error ending game:', error);
      Alert.alert('Hata', 'Oyun sonlandırılırken bir hata oluştu');
    }
  };

  const handleUseBonus = async (bonusType: string) => {
    if (!isPlayerTurn) {
      Alert.alert('Uyarı', 'Şu anda sıra sizde değil.');
      return;
    }

    try {
      if (!userId || !game || !gameRef.current) return;

      const isPlayer1 = game.player1Id === userId;
      const playerField = isPlayer1 ? 'player1' : 'player2';
      const opponentField = isPlayer1 ? 'player2' : 'player1';

      switch (bonusType) {
        case 'regionRestriction':
          Alert.alert(
            'Bölge Seçin',
            'Rakibinizin hangi bölgeye harf koymasını engellemek istiyorsunuz?',
            [
              {
                text: 'Sol Bölge (0-6 sütunları)',
                onPress: async () => {
                  const newBonuses = playerBonuses.filter(b => b !== bonusType);
                  setPlayerBonuses(newBonuses);
                  setRestrictedRegion('left');
                  const targetPlayer = isPlayer1 ? 'player2' : 'player1';

                  await gameRef.current!.update({
                    [`${playerField}Bonuses`]: newBonuses,
                    restrictedRegion: 'left',
                    restrictedRegionTarget: targetPlayer,
                    regionRestrictionTurns: 3,
                  });

                  Alert.alert(
                    'Başarılı',
                    'Rakip 3 tur boyunca sol bölgeye harf koyamayacak!',
                  );
                },
              },
              {
                text: 'Sağ Bölge (8-14 sütunları)',
                onPress: async () => {
                  const newBonuses = playerBonuses.filter(b => b !== bonusType);
                  setPlayerBonuses(newBonuses);
                  setRestrictedRegion('right');

                  const targetPlayer = isPlayer1 ? 'player2' : 'player1';

                  await gameRef.current!.update({
                    [`${playerField}Bonuses`]: newBonuses,
                    restrictedRegion: 'right',
                    restrictedRegionTarget: targetPlayer,
                    regionRestrictionTurns: 3,
                  });

                  Alert.alert(
                    'Başarılı',
                    'Rakip 3 tur boyunca sağ bölgeye harf koyamayacak!',
                  );
                },
              },
              {text: 'İptal', style: 'cancel'},
            ],
          );
          break;

        case 'letterRestriction':
          const opponentField = isPlayer1 ? 'player2' : 'player1';
          const opponentLetters = isPlayer1
            ? game.player2Letters
            : game.player1Letters;

          if (opponentLetters.length < 2) {
            Alert.alert('Uyarı', 'Rakipte yeterli harf bulunmuyor.');
            return;
          }

          const randomIndices: number[] = [];
          while (
            randomIndices.length < 2 &&
            randomIndices.length < opponentLetters.length
          ) {
            const randomIndex = Math.floor(
              Math.random() * opponentLetters.length,
            );
            if (!randomIndices.includes(randomIndex)) {
              randomIndices.push(randomIndex);
            }
          }

          const newBonuses = playerBonuses.filter(b => b !== bonusType);
          setPlayerBonuses(newBonuses);

          await gameRef.current!.update({
            [`${playerField}Bonuses`]: newBonuses,
            [`${opponentField}FrozenLetters`]: randomIndices,
            frozenLetterTurns: 2,
          });

          Alert.alert(
            'Başarılı',
            `Rakibin ${randomIndices.length} harfi 1 tur boyunca donduruldu!`,
          );
          break;

        case 'extraMove':
          setHasExtraMove(true);
          Alert.alert(
            'Başarılı',
            'Ekstra hamle hakkı aktif! Kelime yazdıktan sonra tekrar oynayabileceksiniz.',
          );
          break;
      }
    } catch (error) {
      console.error('Error using bonus:', error);
      Alert.alert('Hata', 'Bonus kullanılırken bir hata oluştu');
    }
  };

  const generateMinesAndRewards = () => {
    const minePositions: MinePosition[] = [
      // Puan Bölünmesi
      {row: 4, col: 8, type: 'pointDivision'},
      {row: 7, col: 9, type: 'pointDivision'},
      {row: 8, col: 3, type: 'pointDivision'},
      {row: 10, col: 4, type: 'pointDivision'},
      {row: 13, col: 12, type: 'pointDivision'},

      // Puan Transferi
      {row: 0, col: 14, type: 'pointTransfer'},
      {row: 3, col: 1, type: 'pointTransfer'},
      {row: 3, col: 12, type: 'pointTransfer'},
      {row: 11, col: 7, type: 'pointTransfer'},

      // Ekstra Hamle Engeli
      {row: 5, col: 6, type: 'bonusCancellation'},
      {row: 12, col: 10, type: 'bonusCancellation'},

      // Kelime İptali
      {row: 1, col: 10, type: 'wordCancellation'},
      {row: 14, col: 2, type: 'wordCancellation'},
    ];

    const rewardPositions: RewardPosition[] = [
      // Bölge Yasağı
      {row: 7, col: 14, type: 'regionRestriction'},
      {row: 9, col: 10, type: 'regionRestriction'},

      // Harf Yasağı
      {row: 0, col: 3, type: 'letterRestriction'},
      {row: 9, col: 5, type: 'letterRestriction'},
      {row: 13, col: 5, type: 'letterRestriction'},

      // Ekstra Hamle Jokeri
      {row: 5, col: 11, type: 'extraMove'},
      {row: 14, col: 7, type: 'extraMove'},
    ];

    setMinePositions(minePositions);
    setRewardPositions(rewardPositions);
  };

  const checkForMineOrReward = (row: number, col: number) => {
    const mine = minePositions.find(m => m.row === row && m.col === col);
    if (mine) {
      return {type: 'mine', data: mine};
    }

    const reward = rewardPositions.find(r => r.row === row && r.col === col);
    if (reward) {
      return {type: 'reward', data: reward};
    }

    return null;
  };

  const getRewardDescription = (rewardType: string): string => {
    switch (rewardType) {
      case 'regionRestriction':
        return 'Bölge Yasağı';
      case 'letterRestriction':
        return 'Harf Yasağı';
      case 'extraMove':
        return 'Ekstra Hamle Jokeri';
      default:
        return 'Bilinmeyen Ödül';
    }
  };

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '00:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const renderFirstMoveHint = () => {
    if (!isFirstMove || !isPlayerTurn) return null;

    return (
      <View style={styles.firstMoveHintContainer}>
        <Text style={styles.firstMoveHint}>
          İlk kelime merkezdeki ⭐ işaretinden geçmelidir
        </Text>
      </View>
    );
  };

  const renderCellBackground = (special: string | null) => {
    if (!special) return styles.cell;

    switch (special) {
      case 'DL':
        return [styles.cell, styles.doubleLetter];
      case 'TL':
        return [styles.cell, styles.tripleLetter];
      case 'DW':
        return [styles.cell, styles.doubleWord];
      case 'TW':
        return [styles.cell, styles.tripleWord];
      case 'STAR':
        return [styles.cell, styles.star];
      default:
        return styles.cell;
    }
  };

  const getCellValidationStyle = (row: number, col: number) => {
    const key = `${row}-${col}`;
    const validation = cellValidationColors[key];

    if (validation === 'valid') return styles.validCell;
    if (validation === 'invalid') return styles.invalidCell;
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Oyun yükleniyor...</Text>
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Oyun bulunamadı.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>
            {game.player1Id === userId ? game.player1Name : game.player2Name}
          </Text>
          <Text style={styles.score}>
            {game.player1Id === userId ? game.player1Score : game.player2Score}
          </Text>
        </View>

        <View style={styles.remainingLettersContainer}>
          <Text style={styles.remainingLetters}>
            {game.remainingLetters.length}
          </Text>
          <Text style={styles.remainingLettersLabel}>Kalan</Text>
        </View>

        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>
            {game.player1Id === userId ? game.player2Name : game.player1Name}
          </Text>
          <Text style={styles.score}>
            {game.player1Id === userId ? game.player2Score : game.player1Score}
          </Text>
        </View>
      </View>

      {isPlayerTurn && remainingTime !== null && (
        <View style={styles.timerContainer}>
          <Text style={styles.timer}>{formatTime(remainingTime)}</Text>
        </View>
      )}

      {renderFirstMoveHint()}

      {/* Game Board */}
      <ScrollView contentContainerStyle={styles.boardContainer}>
        {board.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((cell, colIndex) => (
              <TouchableOpacity
                key={`cell-${rowIndex}-${colIndex}`}
                style={[
                  renderCellBackground(cell.isSpecial),
                  cell.isLocked && styles.lockedCell,
                  cell.isSelected && styles.selectedCell,
                  selectedBoardCell?.row === rowIndex &&
                    selectedBoardCell?.col === colIndex &&
                    styles.highlightedCell,
                  getCellValidationStyle(rowIndex, colIndex),
                ]}
                onPress={() => handleCellSelect(rowIndex, colIndex)}
                disabled={cell.isLocked}>
                <Text style={styles.cellText}>{cell.letter}</Text>
                {cell.letter && cell.letter !== 'JOKER' && (
                  <Text style={styles.cellPointText}>
                    {getLetterPoints(cell.letter)}
                  </Text>
                )}
                {cell.isSpecial && !cell.letter && (
                  <Text style={styles.specialCellText}>
                    {cell.isSpecial === 'DL'
                      ? 'H²'
                      : cell.isSpecial === 'TL'
                      ? 'H³'
                      : cell.isSpecial === 'DW'
                      ? 'K²'
                      : cell.isSpecial === 'TW'
                      ? 'K³'
                      : '★'}
                  </Text>
                )}

                {(() => {
                  const cellKey = `${rowIndex}-${colIndex}`;
                  const matchingWord = Object.keys(completedWordScores).find(
                    wordKey => wordKey.split('|').includes(cellKey),
                  );

                  if (matchingWord && cell.letter) {
                    const wordPositions = matchingWord.split('|');
                    const isLastCell =
                      wordPositions[wordPositions.length - 1] === cellKey;

                    if (isLastCell) {
                      return (
                        <View style={styles.wordScoreIndicator}>
                          <Text style={styles.wordScoreText}>
                            {completedWordScores[matchingWord]}
                          </Text>
                        </View>
                      );
                    }
                  }
                  return null;
                })()}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={styles.playerLettersContainer}>
        {playerLetters.map((letter, index) => (
          <TouchableOpacity
            key={`player-letter-${index}`}
            style={[
              styles.playerLetter,
              selectedLetterIndex === index && styles.selectedPlayerLetter,
              frozenLetters.includes(index) && styles.frozenPlayerLetter,
            ]}
            onPress={() => handleLetterSelect(index)}
            disabled={!isPlayerTurn || frozenLetters.includes(index)}>
            <Text
              style={[
                styles.playerLetterText,
                frozenLetters.includes(index) && styles.frozenLetterText,
              ]}>
              {letter}
            </Text>
            <Text style={styles.letterPoint}>{getLetterPoints(letter)}</Text>
            {frozenLetters.includes(index) && (
              <View style={styles.frozenOverlay}>
                <Text style={styles.frozenIndicator}>❄️</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {playerBonuses.length > 0 && (
        <ScrollView horizontal style={styles.bonusesContainer}>
          {playerBonuses.map((bonus, index) => (
            <TouchableOpacity
              key={`bonus-${index}`}
              style={[
                styles.bonusItem,
                !isPlayerTurn && styles.disabledBonusItem,
              ]}
              onPress={() => handleUseBonus(bonus)}
              disabled={!isPlayerTurn}>
              <Text
                style={[
                  styles.bonusText,
                  !isPlayerTurn && styles.disabledBonusText,
                ]}>
                {bonus === 'regionRestriction' && '🚫 Bölge Yasağı'}
                {bonus === 'letterRestriction' && '🧊 Harf Yasağı'}
                {bonus === 'extraMove' && '🔄 Ekstra Hamle'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, !isPlayerTurn && styles.disabledButton]}
          onPress={handleSubmitWord}
          disabled={
            !isPlayerTurn || currentWord.length === 0 || !currentWordIsValid
          }>
          <Text style={styles.buttonText}>Onayla</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isPlayerTurn && styles.disabledButton]}
          onPress={handlePassTurn}
          disabled={!isPlayerTurn}>
          <Text style={styles.buttonText}>Pas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.surrenderButton]}
          onPress={handleSurrender}>
          <Text style={styles.buttonText}>Teslim Ol</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  playerInfo: {
    alignItems: 'center',
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  score: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  remainingLettersContainer: {
    alignItems: 'center',
  },
  remainingLetters: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  remainingLettersLabel: {
    fontSize: 12,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  timer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d9534f',
  },
  boardContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  doubleLetter: {
    backgroundColor: '#a6d8ff',
  },
  tripleLetter: {
    backgroundColor: '#3f98ff',
  },
  doubleWord: {
    backgroundColor: '#ffb6c1',
  },
  tripleWord: {
    backgroundColor: '#ff6b81',
  },
  star: {
    backgroundColor: '#FFD54F',
  },
  lockedCell: {
    backgroundColor: '#e6e6e6',
  },
  selectedCell: {
    backgroundColor: '#ffffcc',
  },
  highlightedCell: {
    borderColor: '#000',
    borderWidth: 2,
  },
  cellText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  specialCellText: {
    fontSize: 12,
    position: 'absolute',
    textAlign: 'center',
    width: '100%',
    height: '100%',
    textAlignVertical: 'center',
    lineHeight: 24,
  },
  playerLettersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  playerLetter: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    marginHorizontal: 3,
    borderRadius: 4,
  },
  selectedPlayerLetter: {
    backgroundColor: '#ffffcc',
    borderColor: '#ffd700',
    borderWidth: 2,
  },
  playerLetterText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  letterPoint: {
    fontSize: 10,
    position: 'absolute',
    top: 2,
    right: 2,
  },
  bonusesContainer: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  bonusItem: {
    padding: 10,
    backgroundColor: '#e6e6fa',
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#8a2be2',
  },
  bonusText: {
    fontSize: 14,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  controlButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4caf50',
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  surrenderButton: {
    backgroundColor: '#d9534f',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  validCell: {
    backgroundColor: '#90EE90',
    borderColor: '#228B22',
    borderWidth: 2,
  },
  invalidCell: {
    backgroundColor: '#FFB6C1',
    borderColor: '#DC143C',
    borderWidth: 2,
  },
  cellPointText: {
    fontSize: 8,
    fontWeight: 'bold',
    position: 'absolute',
    top: 1,
    right: 1,
    color: '#333',
    minWidth: 10,
    textAlign: 'center',
  },
  wordScoreIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  wordScoreText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  frozenPlayerLetter: {
    backgroundColor: '#B0C4DE',
    opacity: 0.5,
    borderColor: '#4682B4',
    borderWidth: 2,
  },
  frozenIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    fontSize: 12,
  },
  disabledBonusItem: {
    opacity: 0.5,
    backgroundColor: '#f0f0f0',
  },
  disabledBonusText: {
    color: '#888',
  },
  frozenLetterText: {
    color: '#6B7280',
    opacity: 0.6,
  },
  frozenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(176, 196, 222, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  firstMoveHintContainer: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 5,
    alignItems: 'center',
  },
  firstMoveHint: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default GameScreen;
