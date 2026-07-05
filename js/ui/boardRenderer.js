const COLUMN_LABELS = 'ABCDEFGHIJ';

export function createBoardElement(id, size, onCellClick = null) {
  const board = document.createElement('div');
  board.className = 'board';
  board.id = id;
  board.setAttribute('role', 'grid');
  board.setAttribute('aria-label', onCellClick ? 'Enemy waters grid' : 'Your fleet grid');

  const headerRow = document.createElement('div');
  headerRow.className = 'board-row';
  headerRow.setAttribute('role', 'row');
  headerRow.appendChild(createLabel('', 'columnheader'));
  for (let col = 0; col < size; col += 1) {
    headerRow.appendChild(createLabel(COLUMN_LABELS[col], 'columnheader'));
  }
  board.appendChild(headerRow);

  for (let row = 0; row < size; row += 1) {
    const rowEl = document.createElement('div');
    rowEl.className = 'board-row';
    rowEl.setAttribute('role', 'row');
    rowEl.appendChild(createLabel(String(row + 1), 'rowheader'));

    for (let col = 0; col < size; col += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.setAttribute('role', 'gridcell');
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute('aria-label', `${COLUMN_LABELS[col]}${row + 1}, empty`);
      if (onCellClick) {
        cell.addEventListener('click', () => onCellClick(row, col));
      } else {
        cell.tabIndex = -1;
      }
      rowEl.appendChild(cell);
    }
    board.appendChild(rowEl);
  }

  return board;
}

export function renderBoard(boardEl, board, { showShips, gameOver = false }) {
  boardEl.querySelectorAll('.cell').forEach((cell) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const attack = board.attacks[row][col];
    const occupied = board.grid[row][col] !== null;
    const gridCell = board.grid[row][col];

    cell.className = 'cell';

    let stateLabel = 'empty';

    if (attack === 'hit') {
      cell.classList.add('hit');
      stateLabel = gridCell?.ship?.isSunk() ? `sunk, ${gridCell.ship.name}` : 'hit';
      if (gridCell?.ship?.isSunk()) {
        cell.classList.add('sunk');
      }
    } else if (attack === 'miss') {
      cell.classList.add('miss');
      stateLabel = 'miss';
    } else if (showShips && occupied) {
      cell.classList.add('ship');
      stateLabel = 'ship';
    }

    if (gameOver && occupied && attack !== 'hit') {
      cell.classList.add('ship-reveal');
      stateLabel = 'ship revealed';
    }

    cell.setAttribute('aria-label', `${COLUMN_LABELS[col]}${row + 1}, ${stateLabel}`);
  });
}

function createLabel(text, role) {
  const label = document.createElement('div');
  label.className = 'cell-label';
  label.textContent = text;
  label.setAttribute('role', role);
  return label;
}
