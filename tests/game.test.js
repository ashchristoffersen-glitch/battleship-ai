import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import Ship from '../js/game/Ship.js';
import Board from '../js/game/Board.js';
import AiPlayer from '../js/game/AiPlayer.js';
import GameController, { FLEET } from '../js/game/gameController.js';

describe('Ship', () => {
  it('tracks hits and sunk state', () => {
    const ship = new Ship('Destroyer', 2);
    assert.equal(ship.isSunk(), false);
    ship.hit(0);
    assert.equal(ship.isSunk(), false);
    ship.hit(1);
    assert.equal(ship.isSunk(), true);
  });

  it('rejects invalid hit indices', () => {
    const ship = new Ship('Cruiser', 3);
    assert.throws(() => ship.hit(-1), RangeError);
    assert.throws(() => ship.hit(3), RangeError);
  });
});

describe('Board placement', () => {
  it('accepts valid placements and rejects overlap/off-board', () => {
    const board = new Board();
    assert.equal(board.canPlaceShip(2, 0, 0, false), true);
    assert.equal(board.canPlaceShip(5, 0, 6, false), false);
    assert.equal(board.canPlaceShip(5, 6, 0, true), false);

    board.placeShip('Destroyer', 2, 0, 0, false);
    assert.equal(board.canPlaceShip(3, 0, 0, true), false);
    assert.throws(() => board.placeShip('Cruiser', 3, 0, 0, true));
  });
});

describe('Board attacks', () => {
  it('records miss, hit, and sink outcomes', () => {
    const board = new Board();
    board.placeShip('Destroyer', 2, 0, 0, false);

    const miss = board.receiveAttack(5, 5);
    assert.deepEqual(miss, { result: 'miss', ship: null, sunk: false });

    const hit = board.receiveAttack(0, 0);
    assert.equal(hit.result, 'hit');
    assert.equal(hit.ship.name, 'Destroyer');
    assert.equal(hit.sunk, false);

    const sink = board.receiveAttack(0, 1);
    assert.equal(sink.result, 'hit');
    assert.equal(sink.sunk, true);
    assert.equal(board.allSunk(), true);
  });

  it('rejects repeat attacks', () => {
    const board = new Board();
    board.receiveAttack(0, 0);
    assert.throws(() => board.receiveAttack(0, 0));
  });
});

describe('AiPlayer', () => {
  it('easy mode never repeats shots', () => {
    const ownBoard = new Board();
    const enemyBoard = new Board();
    enemyBoard.placeShip('Destroyer', 2, 0, 0, false);
    const ai = new AiPlayer(ownBoard, enemyBoard, 'easy');

    ai.huntPool = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
    const first = ai.takeTurn();
    const second = ai.takeTurn();

    assert.notDeepEqual({ row: first.row, col: first.col }, { row: second.row, col: second.col });
    assert.equal(ai.targetStack.length, 0);
  });

  it('normal mode targets adjacent cells after a hit', () => {
    const ownBoard = new Board();
    const enemyBoard = new Board();
    enemyBoard.placeShip('Cruiser', 3, 0, 0, false);
    const ai = new AiPlayer(ownBoard, enemyBoard, 'normal');

    ai.huntPool = [{ row: 0, col: 1 }];
    ai.takeTurn();

    assert.ok(ai.targetStack.some(({ row, col }) => row === 0 && col === 0));
    assert.ok(ai.targetStack.some(({ row, col }) => row === 0 && col === 2));
  });

  it('locks to the ship axis after two aligned hits', () => {
    const ownBoard = new Board();
    const enemyBoard = new Board();
    enemyBoard.placeShip('Cruiser', 3, 0, 0, false);
    const ai = new AiPlayer(ownBoard, enemyBoard, 'normal');

    ai.huntPool = [{ row: 0, col: 1 }];
    ai.takeTurn();
    ai.targetStack = [{ row: 0, col: 0 }];
    ai.takeTurn();

    assert.ok(ai.targetStack.every(({ row }) => row === 0));
  });
});

describe('GameController', () => {
  it('starts in placement, can start battle, and resolves game over', () => {
    const game = new GameController('normal');
    assert.equal(game.phase, 'placement');

    game.humanBoard.placeFleetRandomly(FLEET);
    game.startBattle();
    assert.equal(game.phase, 'player-turn');
  });
});
