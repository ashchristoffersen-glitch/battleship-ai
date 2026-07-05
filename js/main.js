import GameController from './game/gameController.js';
import Scoreboard from './game/Scoreboard.js';
import { createBoardElement, renderBoard } from './ui/boardRenderer.js';
import { clear as clearMessage, init as initMessage, show as showMessage } from './ui/messageDisplay.js';
import { exceedsDragThreshold, initPlacement } from './ui/dragAndDrop.js';
import {
  ensureHitOverlay,
  ensureSinkOverlay,
  impactCell,
  pulseDefeatBoard,
  screenShake,
  shakeHumanBoard,
  showHitOverlay,
  showSinkOverlay,
  showVictoryConfetti,
  sinkShipCells,
} from './ui/effects.js';
import {
  isMuted,
  playDefeat,
  playHit,
  playIncomingHit,
  playMiss,
  playSinkEnemy,
  playSinkPlayer,
  playVictory,
  resume,
  toggleMuted,
  unlockAudio,
} from './ui/sound.js';

const LAST_DIFFICULTY_KEY = 'battleship-ai-last-difficulty';
const AI_TURN_DELAY_MS = 650;

let game = null;
let scoreboard = null;
let placementControls = null;

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function init() {
  const storage = safeStorage();

  const messageEl = document.getElementById('message');
  const difficultyScreen = document.getElementById('difficulty-screen');
  const gameScreen = document.getElementById('game-screen');
  const dockEl = document.getElementById('dock');
  const humanHost = document.getElementById('human-board');
  const aiHost = document.getElementById('ai-board');
  const scoreboardWins = document.getElementById('wins');
  const scoreboardLosses = document.getElementById('losses');
  const muteBtn = document.getElementById('mute-btn');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayText = document.getElementById('overlay-text');
  const overlayPlayAgain = document.getElementById('overlay-play-again');
  const overlayNewGame = document.getElementById('overlay-new-game');

  initMessage(messageEl);
  scoreboard = new Scoreboard(storage);

  let humanBoardEl = null;
  let aiBoardEl = null;
  let humanBoardWrapper = null;
  let aiBoardWrapper = null;

  function renderScores() {
    scoreboardWins.textContent = String(scoreboard.wins);
    scoreboardLosses.textContent = String(scoreboard.losses);
  }

  function syncMuteButton() {
    const muted = isMuted();
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-pressed', String(muted));
    muteBtn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
  }

  function showDifficultyScreen() {
    difficultyScreen.hidden = false;
    gameScreen.hidden = true;
    overlay.hidden = true;
    clearMessage();
  }

  function showGameScreen() {
    difficultyScreen.hidden = true;
    gameScreen.hidden = false;
  }

  function setupBoards() {
    humanHost.innerHTML = '';
    aiHost.innerHTML = '';
    humanBoardEl = createBoardElement('human-board-grid', game.humanBoard.size);
    aiBoardEl = createBoardElement('ai-board-grid', game.aiBoard.size, onAiCellClick);
    humanBoardWrapper = document.createElement('div');
    aiBoardWrapper = document.createElement('div');
    humanBoardWrapper.className = 'board-wrap';
    aiBoardWrapper.className = 'board-wrap';
    humanBoardWrapper.appendChild(humanBoardEl);
    aiBoardWrapper.appendChild(aiBoardEl);
    humanHost.appendChild(humanBoardWrapper);
    aiHost.appendChild(aiBoardWrapper);
    ensureHitOverlay(humanBoardWrapper);
    ensureSinkOverlay(humanBoardWrapper);
    ensureSinkOverlay(aiBoardWrapper);
  }

  function updatePlacementStatus() {
    const placed = game.humanBoard.ships.length;
    const remaining = Math.max(0, 5 - placed);
    showMessage(
      remaining === 0 ? 'All ships placed. Start the battle.' : `${remaining} ships left to place.`,
      remaining === 0 ? 'success' : 'info',
    );
  }

  function beginPlacement() {
    dockEl.hidden = false;
    setupBoards();
    placementControls = initPlacement(game.humanBoard, humanBoardEl, dockEl, {
      onComplete: startBattle,
      onChange: updatePlacementStatus,
    });
    updatePlacementStatus();
  }

  function startBattle() {
    unlockAudio();
    void resume();
    game.startBattle();
    dockEl.hidden = true;
    renderBoards();
    showMessage('Battle started. Fire at the enemy board.', 'success', 2400);
  }

  function beginNewSession(difficulty) {
    if (storage) {
      storage.setItem(LAST_DIFFICULTY_KEY, difficulty);
    }
    game = new GameController(difficulty);
    showGameScreen();
    beginPlacement();
  }

  function onDifficultyChosen(difficulty) {
    beginNewSession(difficulty);
  }

  function onAiCellClick(row, col) {
    if (!game || game.phase !== 'player-turn') return;
    if (game.aiBoard.attacks[row][col] !== null) {
      showMessage('That square has already been fired on.', 'info', 1800);
      return;
    }

    void resume();
    const outcome = game.humanAttack(row, col);
    if (!outcome) return;

    renderBoards();
    handleHumanAttackFeedback(row, col, outcome);

    if (game.phase === 'game-over') {
      endGame();
      return;
    }

    window.setTimeout(() => {
      const aiOutcome = game.aiAttack();
      if (!aiOutcome) return;
      renderBoards();
      handleAiAttackFeedback(aiOutcome);
      if (game.phase === 'game-over') {
        endGame();
      }
    }, AI_TURN_DELAY_MS);
  }

  function remainingShips(board) {
    return board.ships.filter((ship) => !ship.isSunk()).length;
  }

  function handleHumanAttackFeedback(row, col, outcome) {
    if (outcome.sunk) {
      playSinkEnemy();
      sinkShipCells(aiBoardWrapper, game.aiBoard.getShipCells(outcome.ship));
      showSinkOverlay(aiBoardWrapper, `${remainingShips(game.aiBoard)} ships left.`);
      showMessage(`${remainingShips(game.aiBoard)} ships left on the enemy side.`, 'danger');
      return;
    }

    if (outcome.result === 'hit') {
      playHit();
      screenShake();
      impactCell(aiBoardEl, row, col);
      showHitOverlay(aiBoardWrapper);
      showMessage('Hit! Enemy fleet under fire.', 'success', 1500);
      return;
    }

    playMiss();
    showMessage('Miss.', 'info', 1200);
  }

  function handleAiAttackFeedback(outcome) {
    if (outcome.sunk) {
      playSinkPlayer();
      sinkShipCells(humanBoardWrapper, game.humanBoard.getShipCells(outcome.ship));
      showSinkOverlay(humanBoardWrapper, `${remainingShips(game.humanBoard)} ships left.`);
      showMessage(`${remainingShips(game.humanBoard)} ships left in your fleet.`, 'danger');
      return;
    }

    if (outcome.result === 'hit') {
      playIncomingHit();
      screenShake();
      shakeHumanBoard(humanBoardEl);
      showHitOverlay(humanBoardWrapper);
      showMessage('Your fleet was hit!', 'danger', 1500);
      return;
    }

    playMiss();
    showMessage('Computer missed.', 'info', 1200);
  }

  function renderBoards() {
    const gameOver = game.phase === 'game-over';
    renderBoard(humanBoardEl, game.humanBoard, { showShips: true, gameOver });
    renderBoard(aiBoardEl, game.aiBoard, { showShips: false, gameOver });
  }

  function endGame() {
    overlay.hidden = false;
    if (game.winner === 'human') {
      scoreboard.recordWin();
      overlayTitle.textContent = 'Victory!';
      overlayText.textContent = 'You destroyed the enemy fleet.';
      playVictory();
      showVictoryConfetti();
    } else {
      scoreboard.recordLoss();
      overlayTitle.textContent = 'Defeat';
      overlayText.textContent = 'The computer sank your fleet.';
      playDefeat();
      pulseDefeatBoard(humanBoardEl);
      document.body.classList.add('is-defeat');
      window.setTimeout(() => document.body.classList.remove('is-defeat'), 900);
    }
    renderScores();
  }

  function playAgain() {
    const difficulty = game.difficulty;
    game.reset(difficulty);
    overlay.hidden = true;
    dockEl.hidden = false;
    beginPlacement();
    showMessage('Place your ships for the next round.', 'info', 1800);
  }

  function newGame() {
    scoreboard.reset();
    renderScores();
    if (storage) {
      storage.removeItem(LAST_DIFFICULTY_KEY);
    }
    game = null;
    overlay.hidden = true;
    showDifficultyScreen();
  }

  function bootWithSavedDifficulty() {
    const savedDifficulty = storage?.getItem(LAST_DIFFICULTY_KEY);
    if (savedDifficulty === 'easy' || savedDifficulty === 'normal') {
      game = new GameController(savedDifficulty);
      showGameScreen();
      beginPlacement();
      showMessage('Refresh detected. Place your fleet to begin.', 'info');
      return;
    }
    showDifficultyScreen();
  }

  document.getElementById('diff-easy').addEventListener('click', () => onDifficultyChosen('easy'));
  document.getElementById('diff-normal').addEventListener('click', () => onDifficultyChosen('normal'));
  overlayPlayAgain.addEventListener('click', playAgain);
  overlayNewGame.addEventListener('click', newGame);
  muteBtn.addEventListener('click', () => {
    toggleMuted();
    syncMuteButton();
    if (!isMuted()) {
      unlockAudio();
      void resume();
    }
  });

  renderScores();
  syncMuteButton();
  bootWithSavedDifficulty();
}

document.addEventListener('DOMContentLoaded', init);
