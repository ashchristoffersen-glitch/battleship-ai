import Player from './Player.js';

const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export default class AiPlayer extends Player {
  constructor(ownBoard, enemyBoard, difficulty = 'normal') {
    super('Computer', ownBoard);
    this.enemyBoard = enemyBoard;
    this.difficulty = difficulty;
    this.huntPool = this._buildHuntPool();
    this.targetStack = [];
    this.unresolvedHits = [];
  }

  takeTurn() {
    const { row, col } = this._chooseTarget();
    const outcome = this.enemyBoard.receiveAttack(row, col);
    this._removeFromHuntPool(row, col);

    if (this.difficulty === 'easy') {
      return { row, col, ...outcome };
    }

    if (outcome.result === 'hit') {
      this.unresolvedHits.push({ row, col });
      if (outcome.sunk) {
        this._onShipSunk(outcome.ship);
      } else {
        this._queueTargetsForHit(row, col);
      }
    }

    return { row, col, ...outcome };
  }

  _buildHuntPool() {
    const pool = [];
    for (let row = 0; row < this.enemyBoard.size; row += 1) {
      for (let col = 0; col < this.enemyBoard.size; col += 1) {
        if (this.difficulty === 'easy' || (row + col) % 2 === 0) {
          pool.push({ row, col });
        }
      }
    }
    return this._shuffle(pool);
  }

  _shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  _removeFromHuntPool(row, col) {
    const index = this.huntPool.findIndex((cell) => cell.row === row && cell.col === col);
    if (index !== -1) {
      this.huntPool.splice(index, 1);
    }
  }

  _chooseTarget() {
    while (this.targetStack.length > 0) {
      const candidate = this.targetStack.pop();
      if (this._isValidTarget(candidate.row, candidate.col)) {
        return candidate;
      }
    }

    while (this.huntPool.length > 0) {
      const candidate = this.huntPool.pop();
      if (this._isValidTarget(candidate.row, candidate.col)) {
        return candidate;
      }
    }

    for (let row = 0; row < this.enemyBoard.size; row += 1) {
      for (let col = 0; col < this.enemyBoard.size; col += 1) {
        if (this._isValidTarget(row, col)) {
          return { row, col };
        }
      }
    }

    throw new Error('No valid targets remain');
  }

  _isValidTarget(row, col) {
    return row >= 0
      && row < this.enemyBoard.size
      && col >= 0
      && col < this.enemyBoard.size
      && this.enemyBoard.attacks[row][col] === null;
  }

  _queueTargetsForHit(row, col) {
    const axis = this._detectAxis();
    const directions = axis === 'horizontal'
      ? [DIRECTIONS[2], DIRECTIONS[3]]
      : axis === 'vertical'
        ? [DIRECTIONS[0], DIRECTIONS[1]]
        : DIRECTIONS;

    for (const [dr, dc] of directions) {
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (this._isValidTarget(nextRow, nextCol)) {
        this.targetStack.push({ row: nextRow, col: nextCol });
      }
    }
  }

  _detectAxis() {
    if (this.unresolvedHits.length < 2) {
      return null;
    }

    const rows = new Set(this.unresolvedHits.map((hit) => hit.row));
    const cols = new Set(this.unresolvedHits.map((hit) => hit.col));
    if (rows.size === 1) return 'horizontal';
    if (cols.size === 1) return 'vertical';
    return null;
  }

  _onShipSunk(ship) {
    const sunkCells = this.enemyBoard.getShipCells(ship);
    const sunkSet = new Set(sunkCells.map(([row, col]) => `${row},${col}`));
    this.unresolvedHits = this.unresolvedHits.filter(
      ({ row, col }) => !sunkSet.has(`${row},${col}`),
    );

    this.targetStack = this.targetStack.filter(({ row, col }) => {
      if (!this._isValidTarget(row, col)) {
        return false;
      }
      const adjacentToSunk = sunkCells.some(
        ([sunkRow, sunkCol]) => Math.abs(sunkRow - row) + Math.abs(sunkCol - col) === 1,
      );
      if (!adjacentToSunk) {
        return true;
      }
      return this.unresolvedHits.some(
        ({ row: hitRow, col: hitCol }) => Math.abs(hitRow - row) + Math.abs(hitCol - col) === 1,
      );
    });
  }
}
