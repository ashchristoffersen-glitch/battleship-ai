const STORAGE_KEY = 'battleship-ai-scoreboard';

export default class Scoreboard {
  constructor(storage = null) {
    this.storage = storage;
    this.wins = 0;
    this.losses = 0;
    this._load();
  }

  recordWin() {
    this.wins += 1;
    this._save();
  }

  recordLoss() {
    this.losses += 1;
    this._save();
  }

  reset() {
    this.wins = 0;
    this.losses = 0;
    this._save();
  }

  _load() {
    try {
      const raw = this.storage?.getItem?.(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (typeof parsed?.wins === 'number') this.wins = parsed.wins;
      if (typeof parsed?.losses === 'number') this.losses = parsed.losses;
    } catch {
      this.wins = 0;
      this.losses = 0;
    }
  }

  _save() {
    try {
      this.storage?.setItem?.(STORAGE_KEY, JSON.stringify({
        wins: this.wins,
        losses: this.losses,
      }));
    } catch {
      // Ignore storage failures.
    }
  }
}
