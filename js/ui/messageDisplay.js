let messageEl = null;
let timeoutId = null;

export function init(el) {
  messageEl = el;
}

export function show(text, type = 'info', duration = null) {
  if (!messageEl) return;
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  messageEl.textContent = text;
  messageEl.className = `message message--${type}`;
  if (duration) {
    timeoutId = setTimeout(() => clear(), duration);
  }
}

export function clear() {
  if (!messageEl) return;
  messageEl.textContent = '';
  messageEl.className = 'message';
}
