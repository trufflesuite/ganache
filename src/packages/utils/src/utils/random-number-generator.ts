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

  getNumber(upperExclusiveBound: number = 1): number {
    // I believe this check may be a tiny bit faster than
    // always multiplying by 1
    if (upperExclusiveBound !== 1) {
      return this.rng() * upperExclusiveBound;
    } else {
      return this.rng();
    }
  }

  getNumbers(length: number, upperExclusiveBound: number = 1): number[] {
    const numbers: number[] = [];

    for (let i = 0; i < length; i++) {
      numbers.push(this.getNumber(upperExclusiveBound));
    }

    return numbers;
  }

  getBuffer(length: number): Buffer {
    return Buffer.from(this.getNumbers(length, 256));
  }
}
