type PromiseFn = (...args: any[]) => Promise<any>;

type Count = {
  value: number;
  updatedAt: number;
};

/**
 * @param timestamp
 * @returns the millisconds that have ellapsed since `timestamp`
 */
function timeSince(timestamp: number) {
  return Date.now() - timestamp;
}

/**
 * @param timestamp
 * @param duration
 * @returns the result of rounding `timestamp` toward zero to a multiple of `duration`.
 * If `duration <= 0`, returns `timestamp` unchanged.
 */
function timeTruncate(timestamp: number, duration: number) {
  if (duration <= 0) {
    return timestamp;
  }
  return timestamp - (timestamp % duration);
}

class LimitCounter {
  counters: Map<number, Count> = new Map();
  windowLength: number;
  lastEvict: number;
  constructor(windowLength: number) {
    this.windowLength = windowLength;
  }
  evict() {
    const d = this.windowLength * 3;

    if (timeSince(this.lastEvict) < d) {
      return;
    }

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

  get(previousWindow: number, currentWindow: number) {
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

/**
 * A sliding window rate limiter.
 *
 * Rate estimation from https://blog.cloudflare.com/counting-things-a-lot-of-different-things/
 *
 * Let's say we set a limit of 50 requests per minute. The counter can be
 * thought of like this:
 *
 * ```ascii
 *         ╔══════════════════════════════════╗
 *         ║   sampling period: 60 seconds    ║
 * ┌───────╫────────────────────────┰─────────╫──────────────────────┐
 * │       ║previous minute         ┃         current minute         │
 * │       ║  42 requests           ┃         ║18 requests           │
 * └───────╫────────────────────────┸─────────╫──────────────────────┘
 *          ║         45 secs        ┃ 15 secs ║
 *         ╚══════════════════════════════════╝
 * ```
 *
 * In this situation, we did 18 requests during the current minute, which
 * started 15 seconds ago, and 42 requests during the entire previous minute.
 * Based on this information, the rate approximation is calculated like this:
 *
 * ```javascript
 * rate = (42 * (45 / 60)) + 18
 *      = (42 * 0.75) + 18
 *      = 49.5 // requests
 * ```
 *
 * One more request during the next second and the rate limiter will kick in.
 *
 * This algorithm assumes a constant rate of requests during the previous
 * sampling period (which can be any time span), so the result is only
 * an approximation of the actual rate, but it is quick to calculate and
 * lightweight.
 */
export default class RateLimiter {
  private requestLimit: number;
  private windowLength: number;
  private limitCounter: LimitCounter;
  constructor(requestLimit: number, windowLength: number) {
    this.requestLimit = requestLimit;
    this.windowLength = windowLength;
    this.limitCounter = new LimitCounter(this.windowLength);
  }

  status() {
    const now = Date.now();
    const windowLength = this.windowLength;
    const currentWindow = timeTruncate(now, windowLength);
    const previousWindow = currentWindow - windowLength;
    const [currCount, prevCount] = this.limitCounter.get(
      currentWindow,
      previousWindow
    );

    const diff = now - currentWindow;
    const rate = prevCount * ((windowLength - diff) / windowLength) + currCount;

    return rate;
  }

  private defer(promiseFunction: PromiseFn, skipQueue: boolean = false) {
    let _resolve;
    const prom = new Promise(resolve => {
      _resolve = resolve;
    });
    const fn = () => _resolve(promiseFunction());
    if (skipQueue) {
      this.backpressure.unshift(fn);
    } else {
      this.backpressure.push(fn);
    }
    return prom;
  }

  backpressure: PromiseFn[] = [];
  handle(next: PromiseFn, skipQueue: boolean = false) {
    if (!skipQueue && this.backpressure.length > 0) {
      return this.defer(this.handle.bind(this, next, true));
    }
    const currentWindow = timeTruncate(Date.now(), this.windowLength);
    const rate = this.status();
    const nrate = Math.floor(rate);

    const remaining = this.requestLimit - nrate;
    process.stdout.write("Rate: " + rate + "!               \r");
    if (nrate >= this.requestLimit) {
      const deferred = this.defer(
        this.handle.bind(this, next, true),
        skipQueue
      );

      // if we weren't already waiting on a request, starting waiting on them now
      if (skipQueue || this.backpressure.length === 1) {
        setTimeout(() => {
          this.backpressure.shift()();
        }, this.windowLength / this.requestLimit);
      }
      return deferred;
    }
    this.limitCounter.increment(currentWindow);

    if (this.backpressure.length > 0) {
      // start the next one
      setTimeout(
        () => {
          this.backpressure.shift()();
        },
        remaining === 1 ? this.windowLength / this.requestLimit : 0
      );
    }
    return next();
  }
}
