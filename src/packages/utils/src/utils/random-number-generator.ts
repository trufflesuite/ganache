import seedrandom from "seedrandom";

export class RandomNumberGenerator {
  readonly rng: () => number;

  constructor(seed?: string) {
    if (seed) {
      this.rng = seedrandom.alea(seed);
    } else {
      this.rng = Math.random;
    }
  }

  getNumber(range: number = 1): number {
    // I believe this check may be a tiny bit faster than
    // always multiplying by 1
    if (range !== 1) {
      return this.rng() * range;
    } else {
      return this.rng();
    }
  }

  getNumbers(length: number, range: number = 1): number[] {
    const numbers: number[] = [];

    for (let i = 0; i < length; i++) {
      numbers.push(this.getNumber(range));
    }

    return numbers;
  }

  getBuffer(length: number): Buffer {
    return Buffer.from(this.getNumbers(length, 255));
  }
}
