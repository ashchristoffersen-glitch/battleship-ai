import Ship from './Ship.js';

export const BOARD_SIZE = 10;

export default class Board {
  constructor() {
    this.size = BOARD_SIZE;
    this.reset();
  }

  reset() {
    this.grid = Array.from({ length: this.size }, () => Array.from({ length: this.size }, () => null));
    this.attacks = Array.from({ length: this.size }, () => Array.from({ length: this.size }, () => null));
    this.ships = [];
  }

  canPlaceShip(length, row, col, vertical) {
    return this._cellsForShip(length, row, col, vertical).every(
      ([r, c]) => this._inBounds(r, c) && this.grid[r][c] === null,
    );
  }

  placeShip(name, length, row, col, vertical) {
    const cells = this._cellsForShip(length, row, col, vertical);
    if (!this._canOccupy(cells)) {
      throw new Error(`Cannot place ${name} at (${row}, ${col})`);
    }

    const ship = new Ship(name, length);
    cells.forEach(([r, c], index) => {
      this.grid[r][c] = { ship, index };
    });
    this.ships.push(ship);
    return ship;
  }

  receiveAttack(row, col) {
    if (!this._inBounds(row, col)) {
      throw new RangeError(`Attack (${row}, ${col}) out of bounds`);
    }

    if (this.attacks[row][col] !== null) {
      throw new Error(`Cell (${row}, ${col}) already attacked`);
    }

    const cell = this.grid[row][col];
    if (cell === null) {
      this.attacks[row][col] = 'miss';
      return { result: 'miss', ship: null, sunk: false };
    }

    cell.ship.hit(cell.index);
    this.attacks[row][col] = 'hit';
    return { result: 'hit', ship: cell.ship, sunk: cell.ship.isSunk() };
  }

  allSunk() {
    return this.ships.length > 0 && this.ships.every((ship) => ship.isSunk());
  }

  getShipCells(ship) {
    const cells = [];
    for (let row = 0; row < this.size; row += 1) {
      for (let col = 0; col < this.size; col += 1) {
        const cell = this.grid[row][col];
        if (cell?.ship === ship) {
          cells.push([row, col]);
        }
      }
    }
    return cells;
  }

  placeFleetRandomly(fleet) {
    for (const { name, length } of fleet) {
      const positions = this._enumerateValidPositions(length);
      if (positions.length === 0) {
        throw new Error(`No valid position for ${name}`);
      }
      const choice = positions[Math.floor(Math.random() * positions.length)];
      this.placeShip(name, length, choice.row, choice.col, choice.vertical);
    }
  }

  _enumerateValidPositions(length) {
    const positions = [];
    for (let row = 0; row < this.size; row += 1) {
      for (let col = 0; col < this.size; col += 1) {
        if (this.canPlaceShip(length, row, col, false)) {
          positions.push({ row, col, vertical: false });
        }
        if (this.canPlaceShip(length, row, col, true)) {
          positions.push({ row, col, vertical: true });
        }
      }
    }
    return this._shuffle(positions);
  }

  _shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  _cellsForShip(length, row, col, vertical) {
    return Array.from({ length }, (_, index) => [
      vertical ? row + index : row,
      vertical ? col : col + index,
    ]);
  }

  _canOccupy(cells) {
    return cells.every(([row, col]) => this._inBounds(row, col) && this.grid[row][col] === null);
  }

  _inBounds(row, col) {
    return row >= 0 && row < this.size && col >= 0 && col < this.size;
  }
}
