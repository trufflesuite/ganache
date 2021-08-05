type Count = {
  value: number;
  updatedAt: number;
};

/**
 * @param timestamp
 * @returns the milliseconds that have elapsed since `timestamp`
 */
function timeSince(timestamp: number) {
  return Date.now() - timestamp;
}

export class LimitCounter {
  private counters: Map<number, Count> = new Map();
  private windowLength: number;
  private lastEvict: number;

  constructor(windowLength: number) {
    this.windowLength = windowLength;
  }

  private evict() {
    const d = this.windowLength * 3;
    if (timeSince(this.lastEvict) < d) {
      return;
    }
    this.lastEvict = Date.now();
    const counters = this.counters;
    counters.forEach((v, k) => {
      if (timeSince(v.updatedAt) >= d) {
        counters.delete(k);
      }
    });
  }

  increment(currentWindow: number) {
    this.evict();
    let v = this.counters.get(currentWindow);
    if (v == null) {
      this.counters.set(currentWindow, { value: 1, updatedAt: Date.now() });
    } else {
      v.value += 1;
      v.updatedAt = Date.now();
    }
  }

  get(currentWindow: number, previousWindow: number) {
    let curr = this.counters.get(currentWindow);
    if (curr == null) {
      curr = { value: 0, updatedAt: Date.now() };
    }
    let prev = this.counters.get(previousWindow);
    if (prev == null) {
      prev = { value: 0, updatedAt: Date.now() };
    }

    return [curr.value, prev.value];
  }
}
