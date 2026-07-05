import Board from './Board.js';
import Player from './Player.js';
import AiPlayer from './AiPlayer.js';

export const FLEET = [
  { name: 'Carrier', length: 5 },
  { name: 'Battleship', length: 4 },
  { name: 'Cruiser', length: 3 },
  { name: 'Submarine', length: 3 },
  { name: 'Destroyer', length: 2 },
];

export default class GameController {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty;
    this.humanBoard = new Board();
    this.aiBoard = new Board();
    this.human = new Player('You', this.humanBoard);
    this.ai = new AiPlayer(this.aiBoard, this.humanBoard, difficulty);
    this.phase = 'placement';
    this.winner = null;
    this.onUpdate = null;
  }

  startBattle() {
    if (this.aiBoard.ships.length === 0) {
      this.aiBoard.placeFleetRandomly(FLEET);
    }
    this.phase = 'player-turn';
    this._emit({ type: 'phase-change', phase: this.phase });
  }

  humanAttack(row, col) {
    if (this.phase !== 'player-turn') return null;
    if (this.aiBoard.attacks[row][col] !== null) return null;

    const outcome = this.aiBoard.receiveAttack(row, col);
    this._emit({ type: 'human-attack', row, col, ...outcome });

    if (this.aiBoard.allSunk()) {
      this.phase = 'game-over';
      this.winner = 'human';
      this._emit({ type: 'game-over', winner: 'human' });
      return outcome;
    }

    this.phase = 'ai-turn';
    this._emit({ type: 'phase-change', phase: this.phase });
    return outcome;
  }

  aiAttack() {
    if (this.phase !== 'ai-turn') return null;

    const outcome = this.ai.takeTurn();
    this._emit({ type: 'ai-attack', ...outcome });

    if (this.humanBoard.allSunk()) {
      this.phase = 'game-over';
      this.winner = 'ai';
      this._emit({ type: 'game-over', winner: 'ai' });
      return outcome;
    }

    this.phase = 'player-turn';
    this._emit({ type: 'phase-change', phase: this.phase });
    return outcome;
  }

  reset(difficulty = this.difficulty) {
    this.difficulty = difficulty;
    this.humanBoard.reset();
    this.aiBoard.reset();
    this.human = new Player('You', this.humanBoard);
    this.ai = new AiPlayer(this.aiBoard, this.humanBoard, this.difficulty);
    this.phase = 'placement';
    this.winner = null;
    this._emit({ type: 'reset', difficulty: this.difficulty });
  }

  _emit(event) {
    if (typeof this.onUpdate === 'function') {
      this.onUpdate(event);
    }
  }
}
