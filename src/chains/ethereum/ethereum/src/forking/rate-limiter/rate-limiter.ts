import { AbortError } from "@ganache/ethereum-utils";
import {
  JsonRpcResponse,
  JsonRpcError,
  JsonRpcErrorCode
} from "@ganache/utils";
import { AbortSignal } from "abort-controller";
import Semaphore from "semaphore";
import { LimitCounter } from "./limit-counter";

type PromiseFn = (
  ...args: unknown[]
) => Promise<JsonRpcResponse | JsonRpcError>;

type RateLimitError = JsonRpcError & {
  readonly error: {
    readonly data: {
      readonly rate: {
        readonly allowed_rps: number;
        readonly backoff_seconds: number;
        readonly current_rps: number;
      };
    };
  };
};

/**
 * Sleeps the specified number of milliseconds, then resolves the Promise.
 * Rejects with an `AbortError` if the provided `signal` is already aborted. If
 * the signal's `"abort"` event is invoked while sleeping, the the promise
 * rejects with an `AbortError`.
 *
 * @param ms the number of milliseconds to wait before resolving
 * @param abortSignal the
 * @returns a promise that resolves when `ms`milliseconds have elapsed, or
 * rejects if the `signal` is aborted.
 */
const sleep = (ms: number, signal: AbortSignal) => {
  if (signal.aborted) return Promise.reject(new AbortError());
  return new Promise<void>((resolve, reject) => {
    function abort() {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(new AbortError());
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort);
  });
};

/**
 * @param timestamp
 * @param duration
 * @returns the result of rounding `timestamp` toward zero to a multiple of
 * `duration`.
 */
function timeTruncate(timestamp: number, duration: number) {
  return timestamp - (timestamp % duration);
}

/**
 * @param result
 * @returns true if the result is a JSON-RPC LIMIT_EXCEEDED error
 */
function isExceededLimitError(
  result: JsonRpcResponse | JsonRpcError
): result is RateLimitError {
  return (
    "error" in result && result.error.code === JsonRpcErrorCode.LIMIT_EXCEEDED
  );
}

/**
 * A sliding window rate limiter.
 *
 * Rate estimation from
 * https://blog.cloudflare.com/counting-things-a-lot-of-different-things/
 *
 * Let's say we set a limit of 50 requests per minute. The counter can be
 * thought of like this:
 *
 * ```ascii
 *         ╔══════════════════════════════════╗
 *         ║   sampling period: 60 seconds    ║
 * ╭───────╫────────────────────────┬─────────╫──────────────────────╮
 * │       ║previous minute         │         current minute         │
 * │       ║  42 requests           │         ║18 requests           │
 * ╰───────╫────────────────────────┼─────────╫──────────────────────╯
 *         ║         45 secs        │ 15 secs ║
 *         ╚════════════════════════╧═════════╝
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
 *
 *      = 59.5 // requests
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
  private windowSizeMs: number;
  private limitCounter: LimitCounter;
  private abortSignal: AbortSignal;
  private sem = Semaphore(1);
  private take = () => new Promise(resolve => this.sem.take(resolve));

  constructor(
    requestLimit: number,
    windowSizeMs: number,
    abortSignal: AbortSignal
  ) {
    this.requestLimit = requestLimit;
    // the rate limiter splits the window in 2 to measure the RPS
    this.windowSizeMs = windowSizeMs / 2;
    this.limitCounter = new LimitCounter(this.windowSizeMs);
    this.abortSignal = abortSignal;
  }

  /**
   * @param now
   * @param currentWindow
   * @returns the current request rate and the allowed execution time of the
   * next request
   */
  status(now: number, currentWindow: number) {
    const limit = this.requestLimit;
    const windowSizeMs = this.windowSizeMs;
    const currWindow = currentWindow;
    const prevWindow = currWindow - windowSizeMs;
    const [currCount, prevCount] = this.limitCounter.get(
      currWindow,
      prevWindow
    );

    let rate: number;
    if (prevCount === 0) {
      rate = currCount;
    } else {
      // use the average for the previous window, plus everything for this
      // window
      rate =
        prevCount * ((windowSizeMs - (now - currWindow)) / windowSizeMs) +
        currCount;
    }

    // limit <= 0 means the limiter is disabled
    if (limit > 0 && rate + 1 > limit) {
      const nextCount = currCount + 1;
      const nextLimit = limit + 1;

      const next =
        prevCount === 0
          ? currWindow + windowSizeMs + windowSizeMs / nextLimit
          : (windowSizeMs * (prevCount + nextCount - nextLimit)) / prevCount +
            currWindow;

      return { rate, next };
    }

    return { rate, next: now };
  }

  /**
   * Executes the given fn within the confines of the configured rate limit. If
   * the function's return value is a JSON-RPC LIMIT_EXCEEDED error, it will
   * automatically retry with the given `backoff_seconds`
   * @param fn
   */
  async handle(fn: PromiseFn) {
    // allow scheduling one fn at a time
    await this.take();
    try {
      return await this.schedule(fn);
    } finally {
      this.sem.leave();
    }
  }

  mustBackoff: Promise<void> | null = null;
  counter: number = 0;
  private async schedule(fn: PromiseFn) {
    const signal = this.abortSignal;
    while (true) {
      if (signal.aborted) return Promise.reject(new AbortError());
      if (this.mustBackoff) await this.mustBackoff;

      const now = Date.now();
      const currentWindow = timeTruncate(now, this.windowSizeMs);
      const { rate, next } = this.status(now, currentWindow);

      // process.stdout.write(
      //   `rate: ${rate}, wait: ${next - now}              \r`
      // );

      // if this request would be over the rate limit and the amount of time
      // we'd need to back off is > 1ms we need to schedule this in the future
      if (rate + 1 > this.requestLimit && next > now) {
        await sleep(Date.now() - next, signal);
      } else {
        this.limitCounter.increment(currentWindow);
        const result = await fn();
        if (isExceededLimitError(result)) {
          if ("rate" in result.error.data) {
            const backoffSeconds = result.error.data.rate.backoff_seconds;
            // console.log(`backing off for ${backoffSeconds}`);
            // console.log(result.error.data.rate);

            // TODO: I need to make all in-flight requests that will soon return
            // a LIMIT_EXCEEDED error behave, otherwise we'll just send ALL
            // requests back to Infura simultaneously after their initial 30
            // backoff_seconds have elapsed.
            //
            // When we are *not* self-rate limited (meaning fork.rps isn't set)
            // we need to be able to go at full speed until we are, and THEN we
            // need to go at whatever infura wants.
            //
            // TODO: TODO: ask infura to add the X-Rate-Limit* headers to all
            // HTTP responses so we can poll for info to help us avoid ever
            // getting rate limited in the first place.

            // this is part of an attempt at solving the above comment
            this.requestLimit =
              result.error.data.rate.allowed_rps * (this.windowSizeMs / 1000);

            const limiter = (this.mustBackoff = sleep(
              backoffSeconds * 1000,
              signal
            ));
            await this.mustBackoff;
            if (this.mustBackoff === limiter) {
              this.mustBackoff = null;
            }
            continue;
          } else {
            // we don't know how to parse this error, so we do nothing, I guess?
          }
        }
        return result;
      }
    }
  }
}
