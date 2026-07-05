const sinkOverlayTimers = new WeakMap();
const sinkSequenceTimers = new WeakMap();

function prefersReducedMotion() {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function restartClass(node, className, duration) {
  if (!node) return;
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
  setTimeout(() => node.classList.remove(className), duration);
}

function getCell(boardEl, row, col) {
  return boardEl?.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

function randomBetween(min, max) {
  return min + (Math.random() * (max - min));
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function choose(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function spawnParticles(host, options = {}) {
  if (typeof document === 'undefined' || !host) return 0;

  const {
    kind = 'bubble',
    count = 8,
    palette = [200, 205, 210],
    drift = 24,
    rise = 36,
    size = [6, 10],
    duration = [700, 1100],
    delay = [0, 120],
    opacity = [0.75, 1],
    left = [0, 100],
    top = [0, 100],
    rotate = [-120, 120],
  } = options;

  let maxLifetime = 0;

  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement('span');
    particle.className = `fx-particle fx-particle--${kind}`;

    const particleDelay = randomInt(delay[0], delay[1]);
    const particleDuration = randomInt(duration[0], duration[1]);
    const lifetime = particleDelay + particleDuration + 80;
    maxLifetime = Math.max(maxLifetime, lifetime);

    particle.style.setProperty('--particle-left', `${randomBetween(left[0], left[1]).toFixed(2)}%`);
    particle.style.setProperty('--particle-top', `${randomBetween(top[0], top[1]).toFixed(2)}%`);
    particle.style.setProperty('--particle-drift-x', `${randomBetween(-drift, drift).toFixed(1)}px`);
    particle.style.setProperty('--particle-rise', `${randomBetween(rise * 0.7, rise * 1.25).toFixed(1)}px`);
    particle.style.setProperty('--particle-rotate', `${randomBetween(rotate[0], rotate[1]).toFixed(1)}deg`);
    particle.style.setProperty('--particle-duration', `${particleDuration}ms`);
    particle.style.setProperty('--particle-delay', `${particleDelay}ms`);
    particle.style.setProperty('--particle-opacity', `${randomBetween(opacity[0], opacity[1]).toFixed(2)}`);
    particle.style.setProperty('--particle-hue', `${choose(palette)}`);
    particle.style.setProperty('--particle-size', `${randomBetween(size[0], size[1]).toFixed(1)}px`);

    host.appendChild(particle);
    setTimeout(() => particle.remove(), lifetime);
  }

  return maxLifetime;
}

export function impactCell(boardEl, row, col) {
  restartClass(getCell(boardEl, row, col), 'cell--impact', 320);
}

function clearSinkTimers(boardEl) {
  const timers = sinkSequenceTimers.get(boardEl);
  if (!timers) return;
  timers.forEach((timer) => clearTimeout(timer));
  sinkSequenceTimers.delete(boardEl);
}

export function sinkShipCells(boardEl, cells) {
  if (!boardEl || !cells?.length) return;

  clearSinkTimers(boardEl);
  const cellNodes = cells.map(([row, col]) => getCell(boardEl, row, col)).filter(Boolean);
  if (!cellNodes.length) return;

  const timers = [];
  sinkSequenceTimers.set(boardEl, timers);

  const reducedMotion = prefersReducedMotion();
  const flashClass = 'cell--sink-flash';
  const settledClass = 'cell--sink-settled';
  const flashDuration = 180;
  const stagger = 160;
  const boardPulseDelay = flashDuration + ((cellNodes.length - 1) * stagger) + 180;

  cellNodes.forEach((cell) => {
    cell.classList.remove(settledClass);
    cell.classList.add(flashClass);
  });

  cellNodes.forEach((cell, index) => {
    const timer = setTimeout(() => {
      cell.classList.remove(flashClass);
      cell.classList.add(settledClass);
      if (!reducedMotion) {
        spawnParticles(cell, {
          kind: 'bubble',
          count: 3,
          palette: [195, 200, 205],
          drift: 14,
          rise: 28,
          size: [4, 7],
          duration: [650, 900],
          delay: [0, 40],
          opacity: [0.6, 0.95],
          left: [35, 65],
          top: [35, 65],
          rotate: [-45, 45],
        });
      }
    }, flashDuration + (index * stagger));
    timers.push(timer);
  });

  if (!reducedMotion) {
    const pulseTimer = setTimeout(() => restartClass(boardEl, 'board--sink-pulse', 250), boardPulseDelay);
    timers.push(pulseTimer);
  }
}

export function shakeHumanBoard(boardEl) {
  restartClass(boardEl, 'board--hit-shake', 420);
}

export function pulseDefeatBoard(boardEl) {
  if (prefersReducedMotion()) return;
  restartClass(boardEl, 'board--defeat-pulse', 800);
}

export function screenShake() {
  if (typeof document === 'undefined') return;
  restartClass(document.body, 'screen-shake', 520);
}

export function ensureHitOverlay(container) {
  if (typeof document === 'undefined' || !container) return null;
  let overlay = container.querySelector('.board-hit-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'board-hit-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.textContent = 'HIT';
    container.appendChild(overlay);
  }
  return overlay;
}

export function showHitOverlay(container) {
  const overlay = ensureHitOverlay(container);
  if (!overlay) return;
  restartClass(overlay, 'is-visible', 520);
}

export function ensureSinkOverlay(container) {
  if (typeof document === 'undefined' || !container) return null;
  let overlay = container.querySelector('.board-sink-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'board-sink-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    container.appendChild(overlay);
  }
  return overlay;
}

export function showSinkOverlay(container, text) {
  const overlay = ensureSinkOverlay(container);
  if (!overlay) return;

  const existing = sinkOverlayTimers.get(overlay);
  if (existing) {
    clearTimeout(existing.show);
    clearTimeout(existing.hide);
  }

  overlay.textContent = text;
  overlay.classList.remove('is-visible');
  void overlay.offsetWidth;

  const show = setTimeout(() => overlay.classList.add('is-visible'), 1500);
  const hide = setTimeout(() => overlay.classList.remove('is-visible'), 3000);
  sinkOverlayTimers.set(overlay, { show, hide });
}

export function showVictoryConfetti() {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;
  const layer = document.createElement('div');
  layer.className = 'victory-confetti-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  const lifetime = spawnParticles(layer, {
    kind: 'confetti',
    count: 80,
    palette: [18, 52, 114, 162, 204, 284, 330],
    drift: 90,
    rise: 160,
    size: [8, 14],
    duration: [2200, 3000],
    delay: [0, 600],
    opacity: [0.9, 1],
    left: [0, 100],
    top: [-8, 8],
    rotate: [-720, 720],
  });

  setTimeout(() => layer.remove(), lifetime + 300);
}
