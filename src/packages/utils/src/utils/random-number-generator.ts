import seedrandom from "seedrandom";
export class RandomNumberGenerator {
  readonly rng: ReturnType<seedrandom.Callback>;

  // I was planning on using `state` here to restore the RNG
  // from a saved state (via the db on run or upon a revert),
  // but this functionality was postponed. I'm keeping the arg
  // here as it still applies and is valid code.
  // https://github.com/trufflesuite/ganache/issues/756
  constructor(seed?: string | null, state?: seedrandom.State) {
    if (typeof seed === "string" && typeof state === "undefined") {
      this.rng = seedrandom.alea(seed, { state: true });
    } else if (typeof state === "object") {
      // We can ignore seed even if it was provided.
      // The user is reseeding the rng from a prior state,
      // so let's initialize accordingly
      this.rng = seedrandom.alea("", { state });
    } else {
      const entropy = Math.random() * Date.now();
      this.rng = seedrandom.alea(`${entropy}`, { state: true });
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

  state(): seedrandom.State {
    return this.rng.state();
  }
}
