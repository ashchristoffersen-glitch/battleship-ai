import { FLEET } from '../game/gameController.js';
import { show as showMessage } from './messageDisplay.js';

const DRAG_THRESHOLD = 10;

export function exceedsDragThreshold(dx, dy, threshold = DRAG_THRESHOLD) {
  return Math.hypot(dx, dy) > threshold;
}

export function initPlacement(board, boardEl, dockEl, { onComplete, onChange } = {}) {
  const state = FLEET.map((ship) => ({
    ...ship,
    placed: false,
    vertical: false,
    el: null,
  }));

  renderDock();
  updateDockControls();

  function renderDock() {
    dockEl.innerHTML = '';

    const heading = document.createElement('h2');
    heading.className = 'dock-heading';
    heading.textContent = 'Place your ships';
    dockEl.appendChild(heading);

    const instructions = document.createElement('p');
    instructions.className = 'dock-hint';
    instructions.textContent = 'Tap to rotate, then drag and drop. Ships cannot overlap or leave the board. Or hit Random.';
    dockEl.appendChild(instructions);

    const shipList = document.createElement('div');
    shipList.className = 'ship-list';

    state.filter((ship) => !ship.placed).forEach((ship) => {
      const piece = createShipPiece(ship);
      ship.el = piece;
      shipList.appendChild(piece);
    });

    dockEl.appendChild(shipList);

    const actions = document.createElement('div');
    actions.className = 'dock-actions';

    const randomBtn = document.createElement('button');
    randomBtn.type = 'button';
    randomBtn.className = 'btn btn--secondary';
    randomBtn.textContent = 'Random';
    randomBtn.addEventListener('click', () => {
      randomizeAll();
    });

    const startBtn = document.createElement('button');
    startBtn.type = 'button';
    startBtn.className = 'btn btn--primary';
    startBtn.textContent = 'Start Battle';
    startBtn.disabled = !allPlaced();
    startBtn.addEventListener('click', () => {
      if (!allPlaced()) return;
      onComplete?.();
    });

    dockEl._startButton = startBtn;
    actions.append(randomBtn, startBtn);
    dockEl.appendChild(actions);

    if (allPlaced()) {
      onChange?.(true);
    }
  }

  function updateDockControls() {
    const startBtn = dockEl._startButton;
    if (startBtn) {
      startBtn.disabled = !allPlaced();
    }
    onChange?.(allPlaced());
  }

  function allPlaced() {
    return state.every((ship) => ship.placed);
  }

  function createShipPiece(ship) {
    const piece = document.createElement('div');
    piece.className = 'ship-piece';
    piece.dataset.name = ship.name;
    piece.dataset.length = String(ship.length);
    piece.setAttribute('role', 'button');
    piece.setAttribute('tabindex', '0');
    piece.setAttribute('aria-label', `${ship.name}, length ${ship.length}`);
    renderShipPiece(piece, ship);

    let drag = null;

    const startPointer = (event) => {
      if (ship.placed) return;
      piece.setPointerCapture?.(event.pointerId);
      drag = {
        pointerId: event.pointerId,
        type: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        pointerX: event.clientX,
        pointerY: event.clientY,
        dragging: false,
        clone: null,
      };
      event.preventDefault();
    };

    const movePointer = (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag.pointerX = event.clientX;
      drag.pointerY = event.clientY;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;

      if (!drag.dragging && !exceedsDragThreshold(dx, dy)) {
        return;
      }

      if (!drag.dragging) {
        drag.dragging = true;
        drag.clone = piece.cloneNode(true);
        drag.clone.classList.add('ship-piece--dragging');
        drag.clone.style.position = 'fixed';
        drag.clone.style.pointerEvents = 'none';
        drag.clone.style.left = `${event.clientX - 20}px`;
        drag.clone.style.top = `${event.clientY - 20}px`;
        drag.clone.style.zIndex = '1000';
        document.body.appendChild(drag.clone);
      }

      event.preventDefault();
      if (drag.clone) {
        drag.clone.style.left = `${event.clientX - 20}px`;
        drag.clone.style.top = `${event.clientY - 20}px`;
      }
      highlightDropTarget(event.clientX, event.clientY, ship.length, ship.vertical);
    };

    const endPointer = (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      piece.releasePointerCapture?.(event.pointerId);

      const wasDragging = drag.dragging;
      clearDragVisuals();

      if (!wasDragging) {
        ship.vertical = !ship.vertical;
        renderShipPiece(piece, ship);
        return;
      }

      const target = document.elementFromPoint(event.clientX, event.clientY);
      const cell = target?.closest?.('.cell');
      if (!cell || !cell.closest('#human-board')) {
        showMessage('That ship snapped back.', 'info', 1200);
        return;
      }

      const row = Number(cell.dataset.row);
      const col = Number(cell.dataset.col);
      attemptPlace(ship, row, col);
    };

    const cancelPointer = () => {
      clearDragVisuals();
      drag = null;
    };

    function clearDragVisuals() {
      clearHighlights();
      if (drag?.clone?.isConnected) {
        drag.clone.remove();
      }
      drag = null;
    }

    piece.addEventListener('pointerdown', startPointer);
    piece.addEventListener('pointermove', movePointer);
    piece.addEventListener('pointerup', endPointer);
    piece.addEventListener('pointercancel', cancelPointer);
    piece.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        ship.vertical = !ship.vertical;
        renderShipPiece(piece, ship);
      }
    });

    return piece;
  }

  function attemptPlace(ship, row, col) {
    if (!board.canPlaceShip(ship.length, row, col, ship.vertical)) {
      flashInvalid(row, col, ship.length, ship.vertical);
      return;
    }

    board.placeShip(ship.name, ship.length, row, col, ship.vertical);
    ship.placed = true;
    renderBoardPlacement(row, col, ship.length, ship.vertical);
    renderDock();
    updateDockControls();
  }

  function randomizeAll() {
    board.reset();
    state.forEach((ship) => {
      ship.placed = false;
      ship.vertical = false;
    });
    board.placeFleetRandomly(FLEET);
    state.forEach((ship) => {
      const placedShip = board.ships.find((candidate) => candidate.name === ship.name);
      ship.placed = Boolean(placedShip);
    });
    boardEl.querySelectorAll('.cell').forEach((cell) => cell.classList.remove('ship'));
    board.ships.forEach((shipModel) => {
      board.getShipCells(shipModel).forEach(([row, col]) => {
        const cell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        cell?.classList.add('ship');
      });
    });
    renderDock();
    updateDockControls();
    showMessage('Fleet randomized. Start the battle when ready.', 'success', 1800);
  }

  function renderShipPiece(piece, ship) {
    piece.classList.toggle('vertical', ship.vertical);
    piece.innerHTML = '';

    for (let index = 0; index < ship.length; index += 1) {
      const segment = document.createElement('div');
      segment.className = 'ship-segment';
      piece.appendChild(segment);
    }

    const label = document.createElement('span');
    label.className = 'ship-piece-label';
    label.textContent = ship.name;
    piece.appendChild(label);
  }

  function renderBoardPlacement(row, col, length, vertical) {
    for (let index = 0; index < length; index += 1) {
      const cellRow = vertical ? row + index : row;
      const cellCol = vertical ? col : col + index;
      const cell = boardEl.querySelector(`.cell[data-row="${cellRow}"][data-col="${cellCol}"]`);
      cell?.classList.add('ship');
    }
  }

  function highlightDropTarget(pointerX, pointerY, length, vertical) {
    clearHighlights();
    const target = document.elementFromPoint(pointerX, pointerY)?.closest?.('.cell');
    if (!target || !target.closest('#human-board')) return;
    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);

    for (let index = 0; index < length; index += 1) {
      const cellRow = vertical ? row + index : row;
      const cellCol = vertical ? col : col + index;
      const cell = boardEl.querySelector(`.cell[data-row="${cellRow}"][data-col="${cellCol}"]`);
      cell?.classList.add('drop-preview');
    }
  }

  function clearHighlights() {
    boardEl.querySelectorAll('.drop-preview').forEach((cell) => cell.classList.remove('drop-preview'));
  }

  function flashInvalid(row, col, length, vertical) {
    const cells = [];
    let outOfBounds = false;
    let overlapping = false;

    for (let index = 0; index < length; index += 1) {
      const cellRow = vertical ? row + index : row;
      const cellCol = vertical ? col : col + index;
      if (cellRow < 0 || cellRow >= board.size || cellCol < 0 || cellCol >= board.size) {
        outOfBounds = true;
        continue;
      }
      const cell = boardEl.querySelector(`.cell[data-row="${cellRow}"][data-col="${cellCol}"]`);
      if (cell) {
        cells.push(cell);
        if (board.grid[cellRow][cellCol] !== null) {
          overlapping = true;
        }
      }
    }

    cells.forEach((cell) => {
      cell.classList.add('placement-invalid');
      cell.addEventListener('animationend', () => cell.classList.remove('placement-invalid'), { once: true });
    });

    if (overlapping) {
      showMessage('Can’t place there — overlapping another ship.', 'danger', 2000);
    } else if (outOfBounds) {
      showMessage('Can’t place there — ship goes off the board.', 'danger', 2000);
    } else {
      showMessage('Can’t place there.', 'danger', 2000);
    }
  }

  return {
    isComplete: () => allPlaced(),
    showRandomizedMessage: () => showMessage('Fleet randomized. Start the battle when ready.', 'success', 1800),
    refreshDock: () => {
      renderDock();
      updateDockControls();
    },
  };
}
