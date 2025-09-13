export type CellContent = string | null;

export interface BoardMap {
  [key: string]: CellContent;
}

export interface LetterInfo {
  count: number;
  points: number;
}

export interface LetterDistribution {
  [letter: string]: LetterInfo;
}

export const boardMapToArray = (
  boardMap: BoardMap,
  size = 15,
): CellContent[][] => {
  const board: CellContent[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(null));

  Object.entries(boardMap).forEach(([key, value]) => {
    const [row, col] = key.split(',').map(Number);
    board[row][col] = value;
  });

  return board;
};

export const boardArrayToMap = (boardArray: CellContent[][]): BoardMap => {
  const boardMap: BoardMap = {};

  boardArray.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      boardMap[`${rowIndex},${colIndex}`] = cell;
    });
  });

  return boardMap;
};

export const generateLetterPool = (): string[] => {
  const letterDistribution: LetterDistribution = {
    A: {count: 12, points: 1},
    B: {count: 2, points: 3},
    C: {count: 2, points: 4},
    Ç: {count: 2, points: 4},
    D: {count: 2, points: 3},
    E: {count: 8, points: 1},
    F: {count: 1, points: 7},
    G: {count: 1, points: 5},
    Ğ: {count: 1, points: 8},
    H: {count: 1, points: 5},
    I: {count: 4, points: 2},
    İ: {count: 7, points: 1},
    J: {count: 1, points: 10},
    K: {count: 7, points: 1},
    L: {count: 7, points: 1},
    M: {count: 4, points: 2},
    N: {count: 5, points: 1},
    O: {count: 3, points: 2},
    Ö: {count: 1, points: 7},
    P: {count: 1, points: 5},
    R: {count: 6, points: 1},
    S: {count: 3, points: 2},
    Ş: {count: 2, points: 4},
    T: {count: 5, points: 1},
    U: {count: 3, points: 2},
    Ü: {count: 2, points: 3},
    V: {count: 1, points: 7},
    Y: {count: 2, points: 3},
    Z: {count: 2, points: 4},
    JOKER: {count: 2, points: 0},
  };

  const letterPool: string[] = [];

  for (const [letter, {count}] of Object.entries(letterDistribution)) {
    for (let i = 0; i < count; i++) {
      letterPool.push(letter);
    }
  }

  for (let i = letterPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letterPool[i], letterPool[j]] = [letterPool[j], letterPool[i]];
  }

  return letterPool;
};

export const getLetterPoints = (letter: string): number => {
  const pointsMap: {[key: string]: number} = {
    A: 1,
    B: 3,
    C: 4,
    Ç: 4,
    D: 3,
    E: 1,
    F: 7,
    G: 5,
    Ğ: 8,
    H: 5,
    I: 2,
    İ: 1,
    J: 10,
    K: 1,
    L: 1,
    M: 2,
    N: 1,
    O: 2,
    Ö: 7,
    P: 5,
    R: 1,
    S: 2,
    Ş: 4,
    T: 1,
    U: 2,
    Ü: 3,
    V: 7,
    Y: 3,
    Z: 4,
    JOKER: 0,
  };

  return pointsMap[letter] || 0;
};

export interface MinesMap {
  [position: string]: string;
}

export interface BonusesMap {
  [position: string]: string;
}

export interface MinesAndBonusesResult {
  minesMap: MinesMap;
  bonusesMap: BonusesMap;
}

export const assignRandomMinesAndBonuses = (): MinesAndBonusesResult => {
  const mineTypes: {[key: string]: number} = {
    pointDivision: 5,
    pointTransfer: 4,
    letterLoss: 3,
    bonusCancellation: 2,
    wordCancellation: 2,
  };

  const bonusTypes: {[key: string]: number} = {
    regionRestriction: 2,
    letterRestriction: 3,
    extraMove: 2,
  };

  const minesMap: MinesMap = {};
  const bonusesMap: BonusesMap = {};

  placeMinesOrBonuses(minesMap, mineTypes);

  placeMinesOrBonuses(bonusesMap, bonusTypes, minesMap);

  return {minesMap, bonusesMap};
};

const placeMinesOrBonuses = (
  map: {[key: string]: string},
  types: {[key: string]: number},
  existingMap?: {[key: string]: string},
): void => {
  const boardSize = 15;
  const centerPos = Math.floor(boardSize / 2);

  Object.entries(types).forEach(([type, count]) => {
    let placedCount = 0;

    while (placedCount < count) {
      const row = Math.floor(Math.random() * boardSize);
      const col = Math.floor(Math.random() * boardSize);
      const pos = `${row},${col}`;

      if (row === centerPos && col === centerPos) {
        continue;
      }

      const specialPositions = getSpecialPositions();
      if (specialPositions.includes(pos)) {
        continue;
      }

      if (map[pos] || (existingMap && existingMap[pos])) {
        continue;
      }

      map[pos] = type;
      placedCount++;
    }
  });
};

const getSpecialPositions = (): string[] => {
  return [
    '0,3',
    '0,11',
    '2,6',
    '2,8',
    '3,0',
    '3,7',
    '3,14',
    '6,2',
    '6,6',
    '6,8',
    '6,12',
    '7,3',
    '7,11',
    '8,2',
    '8,6',
    '8,8',
    '8,12',
    '11,0',
    '11,7',
    '11,14',
    '12,6',
    '12,8',
    '14,3',
    '14,11',

    '1,5',
    '1,9',
    '5,1',
    '5,5',
    '5,9',
    '5,13',
    '9,1',
    '9,5',
    '9,9',
    '9,13',
    '13,5',
    '13,9',

    '1,1',
    '2,2',
    '3,3',
    '4,4',
    '10,10',
    '11,11',
    '12,12',
    '13,13',
    '13,1',
    '12,2',
    '11,3',
    '10,4',
    '4,10',
    '3,11',
    '2,12',
    '1,13',

    '0,0',
    '0,7',
    '0,14',
    '7,0',
    '7,14',
    '14,0',
    '14,7',
    '14,14',
  ];
};
