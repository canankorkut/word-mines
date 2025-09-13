import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import {getCurrentUser} from './authService';
import {
  generateLetterPool,
  assignRandomMinesAndBonuses,
  BoardMap,
  MinesMap,
  BonusesMap,
} from './gameUtils';

export interface ActiveGame {
  id: string;
  opponentName: string;
  playerScore: number;
  opponentScore: number;
  isPlayerTurn: boolean;
  timeLimit: string;
  lastMoveTime: Date | null;
  status: string;
}

export interface CompletedGame {
  id: string;
  opponentName: string;
  playerScore: number;
  opponentScore: number;
  playerWon: boolean;
  endedAt: Date;
  status: string;
}

export interface GameData {
  id?: string;
  player1Id: string;
  player1Name: string;
  player1Score: number;
  player2Id: string;
  player2Name: string;
  player2Score: number;
  status: string;
  timeLimit: string;
  createdAt: FirebaseFirestoreTypes.Timestamp | null;
  updatedAt: FirebaseFirestoreTypes.Timestamp | null;
  lastMoveTime: FirebaseFirestoreTypes.Timestamp | null;
  currentTurn: string;
  board: BoardMap;
  letterPool: string[];
  player1Letters: string[];
  player2Letters: string[];
  remainingLetters: string[];
  mines: MinesMap;
  bonuses: BonusesMap;
  player1Bonuses: string[];
  player2Bonuses: string[];
  gameLog: any[];
  endedAt?: FirebaseFirestoreTypes.Timestamp | null;
  winner?: string;
  endReason?: string;
  minePositions?: MinePosition[];
  rewardPositions?: RewardPosition[];
  restrictedRegion?: 'left' | 'right' | null;
  restrictedRegionTarget?: 'player1' | 'player2' | null;
  player1FrozenLetters?: number[];
  player2FrozenLetters?: number[];
  player1ExtraMove?: boolean;
  player2ExtraMove?: boolean;
  regionRestriction?: {
    affectedPlayer: string;
    restrictedRegion: string;
    expiresAt: Date;
  } | null;
  frozenLetters?: {
    affectedPlayer: string;
    indices: number[];
    expiresAt: any;
  } | null;
  extraMove?: {
    playerId: string;
    active: boolean;
  } | null;
  frozenLetterTurns?: number;
  regionRestrictionTurns?: number;
}

export interface MinePosition {
  row: number;
  col: number;
  type:
    | 'pointDivision'
    | 'pointTransfer'
    | 'bonusCancellation'
    | 'wordCancellation';
}

export interface RewardPosition {
  row: number;
  col: number;
  type: 'regionRestriction' | 'letterRestriction' | 'extraMove';
}

export const getActiveGames = async (userId: string): Promise<ActiveGame[]> => {
  try {
    const games1Query = await firestore()
      .collection('games')
      .where('player1Id', '==', userId)
      .get();

    const games2Query = await firestore()
      .collection('games')
      .where('player2Id', '==', userId)
      .get();

    const games1: ActiveGame[] = games1Query.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          opponentName: data.player2Name || 'Rakip Bekleniyor',
          playerScore: data.player1Score || 0,
          opponentScore: data.player2Score || 0,
          isPlayerTurn: data.currentTurn === 'player1',
          timeLimit: data.timeLimit,
          lastMoveTime: data.lastMoveTime?.toDate() || null,
          status: data.status,
        };
      })
      .filter(game => game.status === 'waiting' || game.status === 'active');

    const games2: ActiveGame[] = games2Query.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          opponentName: data.player1Name,
          playerScore: data.player2Score || 0,
          opponentScore: data.player1Score || 0,
          isPlayerTurn: data.currentTurn === 'player2',
          timeLimit: data.timeLimit,
          lastMoveTime: data.lastMoveTime?.toDate() || null,
          status: data.status,
        };
      })
      .filter(game => game.status === 'waiting' || game.status === 'active');

    return [...games1, ...games2];
  } catch (error) {
    console.error('Error getting active games:', error);
    throw error;
  }
};

export const getCompletedGames = async (
  userId: string,
): Promise<CompletedGame[]> => {
  try {
    const games1Query = await firestore()
      .collection('games')
      .where('player1Id', '==', userId)
      .get();

    const games2Query = await firestore()
      .collection('games')
      .where('player2Id', '==', userId)
      .get();

    const games1: CompletedGame[] = games1Query.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          opponentName: data.player2Name,
          playerScore: data.player1Score || 0,
          opponentScore: data.player2Score || 0,
          playerWon: data.winner === 'player1',
          endedAt: data.endedAt?.toDate() || new Date(),
          status: data.status,
        };
      })
      .filter(game => game.status === 'completed');

    const games2: CompletedGame[] = games2Query.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          opponentName: data.player1Name,
          playerScore: data.player2Score || 0,
          opponentScore: data.player1Score || 0,
          playerWon: data.winner === 'player2',
          endedAt: data.endedAt?.toDate() || new Date(),
          status: data.status,
        };
      })
      .filter(game => game.status === 'completed');

    const allGames = [...games1, ...games2].sort(
      (a, b) => b.endedAt.getTime() - a.endedAt.getTime(),
    );

    return allGames.slice(0, 10);
  } catch (error) {
    console.error('Error getting completed games:', error);
    throw error;
  }
};

export const createGame = async (
  userId: string,
  timeLimit: string,
): Promise<string | null> => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.username) {
      throw new Error('Kullanıcı bilgileri bulunamadı');
    }

    const waitingGamesQuery = await firestore()
      .collection('games')
      .where('status', '==', 'waiting')
      .get();

    const eligibleGames = waitingGamesQuery.docs.filter(doc => {
      const data = doc.data();
      return data.timeLimit === timeLimit && data.player1Id !== userId;
    });

    if (eligibleGames.length > 0) {
      const gameDoc = eligibleGames[0];
      const gameData = gameDoc.data();

      const remainingLetters = [...gameData.remainingLetters];
      const player2Letters = [];

      for (let i = 0; i < 7 && remainingLetters.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * remainingLetters.length);
        player2Letters.push(remainingLetters.splice(randomIndex, 1)[0]);
      }

      await gameDoc.ref.update({
        player2Id: userId,
        player2Name: user.username,
        status: 'active',
        updatedAt: firestore.FieldValue.serverTimestamp(),
        currentTurn: Math.random() < 0.5 ? 'player1' : 'player2',
        lastMoveTime: firestore.FieldValue.serverTimestamp(),
        player2Letters: player2Letters,
        remainingLetters: remainingLetters,
      });

      return gameDoc.id;
    } else {
      const letterPool = generateLetterPool();
      const {minesMap, bonusesMap} = assignRandomMinesAndBonuses();
      const {minePositions, rewardPositions} = generateMinesAndRewards();
      const boardMap: BoardMap = {};
      const remainingLetters = [...letterPool];
      const player1Letters = [];

      for (let i = 0; i < 7 && remainingLetters.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * remainingLetters.length);
        player1Letters.push(remainingLetters.splice(randomIndex, 1)[0]);
      }

      const gameRef = await firestore().collection('games').add({
        player1Id: userId,
        player1Name: user.username,
        player1Score: 0,
        player2Id: '',
        player2Name: '',
        player2Score: 0,
        status: 'waiting',
        timeLimit: timeLimit,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        lastMoveTime: null,
        currentTurn: '',
        board: boardMap,
        letterPool: letterPool,
        player1Letters: player1Letters,
        player2Letters: [],
        remainingLetters: remainingLetters,
        mines: minesMap,
        bonuses: bonusesMap,
        player1Bonuses: [],
        player2Bonuses: [],
        gameLog: [],
        minePositions: minePositions,
        rewardPositions: rewardPositions,
        restrictedRegion: null,
        player1FrozenLetters: [],
        player2FrozenLetters: [],
        player1ExtraMove: false,
        player2ExtraMove: false,
        regionRestriction: null,
        frozenLetters: null,
        extraMove: null,
      });

      return null;
    }
  } catch (error) {
    console.error('Error creating/joining game:', error);
    throw error;
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

  return {minePositions, rewardPositions};
};

export const joinGame = async (gameId: string): Promise<GameData> => {
  try {
    const gameRef = firestore().collection('games').doc(gameId);
    const gameSnapshot = await gameRef.get();

    if (!gameSnapshot.exists) {
      throw new Error('Oyun bulunamadı');
    }

    const gameData = gameSnapshot.data() as GameData;

    if (!gameData) {
      throw new Error('Oyun verisi bulunamadı');
    }

    const processedData: GameData = {
      ...gameData,
      lastMoveTime: gameData.lastMoveTime ? gameData.lastMoveTime : null,
      createdAt: gameData.createdAt ? gameData.createdAt : null,
      updatedAt: gameData.updatedAt ? gameData.updatedAt : null,
      endedAt: gameData.endedAt ? gameData.endedAt : null,
    };

    await gameRef.update({
      lastAccessTime: firestore.FieldValue.serverTimestamp(),
    });

    return {
      id: gameId,
      ...processedData,
    };
  } catch (error) {
    console.error('Error joining game:', error);
    throw error;
  }
};

export const updatePlayerStats = async (
  userId: string,
  didWin: boolean,
): Promise<number> => {
  try {
    const userRef = firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data() || {};
      const gamesPlayed = (userData.gamesPlayed || 0) + 1;
      const gamesWon = (userData.gamesWon || 0) + (didWin ? 1 : 0);
      const successRate = (gamesWon / gamesPlayed) * 100;

      await userRef.update({
        gamesPlayed,
        gamesWon,
        successRate,
      });

      return successRate;
    }

    return 0;
  } catch (error) {
    console.error('Error updating player stats:', error);
    throw error;
  }
};

export const surrenderGame = async (
  gameId: string,
  playerId: string,
): Promise<string> => {
  try {
    const gameRef = firestore().collection('games').doc(gameId);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) {
      throw new Error('Oyun bulunamadı');
    }

    const gameData = gameDoc.data();
    if (!gameData) {
      throw new Error('Oyun verisi bulunamadı');
    }

    const isPlayer1 = gameData.player1Id === playerId;
    const winner = isPlayer1 ? 'player2' : 'player1';

    await gameRef.update({
      status: 'completed',
      winner: winner,
      endedAt: firestore.FieldValue.serverTimestamp(),
      endReason: 'surrender',
    });

    const winnerId = isPlayer1 ? gameData.player2Id : gameData.player1Id;
    await updatePlayerStats(playerId, false);
    await updatePlayerStats(winnerId, true);

    return winner;
  } catch (error) {
    console.error('Error surrendering game:', error);
    throw error;
  }
};

interface MineResult {
  mineType: string;
  scoreChange?: number;
}

interface BonusResult {
  bonusType: string;
}

type MineOrBonusResult = MineResult | BonusResult | null;

export const checkMineAndBonus = async (
  gameId: string,
  playerId: string,
  row: number,
  col: number,
): Promise<MineOrBonusResult> => {
  try {
    const gameRef = firestore().collection('games').doc(gameId);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) {
      throw new Error('Oyun bulunamadı');
    }

    const gameData = gameDoc.data();
    if (!gameData) {
      throw new Error('Oyun verisi bulunamadı');
    }

    const isPlayer1 = gameData.player1Id === playerId;
    const playerField = isPlayer1 ? 'player1' : 'player2';
    const opponentField = isPlayer1 ? 'player2' : 'player1';

    const mine = gameData.minePositions?.find(
      (m: MinePosition) => m.row === row && m.col === col,
    );
    if (mine) {
      let updateData: {[key: string]: any} = {};
      let scoreChange = 0;

      switch (mine.type) {
        case 'pointDivision':
          break;

        case 'pointTransfer':
          break;
      }

      updateData.gameLog = firestore.FieldValue.arrayUnion({
        playerId,
        action: 'hitMine',
        mineType: mine.type,
        scoreChange,
        timestamp: firestore.FieldValue.serverTimestamp(),
      });

      if (Object.keys(updateData).length > 1) {
        await gameRef.update(updateData);
      }

      return {mineType: mine.type, scoreChange};
    }

    const reward = gameData.rewardPositions?.find(
      (r: RewardPosition) => r.row === row && r.col === col,
    );
    if (reward) {
      const playerBonuses = [...(gameData[`${playerField}Bonuses`] || [])];
      playerBonuses.push(reward.type);

      await gameRef.update({
        [`${playerField}Bonuses`]: playerBonuses,
        gameLog: firestore.FieldValue.arrayUnion({
          playerId,
          action: 'collectedBonus',
          bonusType: reward.type,
          timestamp: firestore.FieldValue.serverTimestamp(),
        }),
      });

      return {bonusType: reward.type};
    }

    return null;
  } catch (error) {
    console.error('Error checking mine and bonus:', error);
    throw error;
  }
};

export const useBonus = async (
  gameId: string,
  playerId: string,
  bonusType: string,
  targetPosition?: string,
): Promise<boolean> => {
  try {
    const gameRef = firestore().collection('games').doc(gameId);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) {
      throw new Error('Oyun bulunamadı');
    }

    const gameData = gameDoc.data();
    if (!gameData) {
      throw new Error('Oyun verisi bulunamadı');
    }

    const isPlayer1 = gameData.player1Id === playerId;
    const playerField = isPlayer1 ? 'player1' : 'player2';
    const opponentField = isPlayer1 ? 'player2' : 'player1';

    const playerBonuses = gameData[`${playerField}Bonuses`] || [];
    const bonusIndex = playerBonuses.indexOf(bonusType);

    if (bonusIndex === -1) {
      throw new Error('Bu bonus sizde bulunmuyor');
    }

    playerBonuses.splice(bonusIndex, 1);
    let updateData: {[key: string]: any} = {
      [`${playerField}Bonuses`]: playerBonuses,
    };

    switch (bonusType) {
      case 'regionRestriction':
        updateData.restrictedRegion = targetPosition || 'left';
        break;

      case 'letterRestriction':
        const frozenIndices: number[] = [];
        while (frozenIndices.length < 2) {
          const randomIndex = Math.floor(Math.random() * 7);
          if (!frozenIndices.includes(randomIndex)) {
            frozenIndices.push(randomIndex);
          }
        }
        updateData[`${opponentField}FrozenLetters`] = frozenIndices;
        break;

      case 'extraMove':
        updateData[`${playerField}ExtraMove`] = true;
        break;
    }

    updateData.gameLog = firestore.FieldValue.arrayUnion({
      playerId,
      action: 'usedBonus',
      bonusType,
      timestamp: firestore.FieldValue.serverTimestamp(),
    });

    await gameRef.update(updateData);
    return true;
  } catch (error) {
    console.error('Error using bonus:', error);
    throw error;
  }
};
