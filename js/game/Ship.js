export default class Ship {
  constructor(name, length) {
    this.name = name;
    this.length = length;
    this.hits = Array.from({ length }, () => false);
  }

  hit(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.length) {
      throw new RangeError(`Hit index ${index} out of range for ${this.name}`);
    }
    this.hits[index] = true;
  }

  isSunk() {
    return this.hits.every(Boolean);
  }
}
