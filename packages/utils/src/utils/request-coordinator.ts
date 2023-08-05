import { OverloadedParameters } from "../types";

const noop = () => {};
type RejectableTask = {
  execute: (...args: any) => Promise<any>;
  reject: (reason?: any) => void;
};

/**
 * Responsible for managing global concurrent requests.
 */
export class RequestCoordinator {
  /**
   * The number of concurrent requests. Set to null for no limit.
   */
  public limit: number;

  /**
   * The pending requests. You can't do anything with this array.
   */
  public readonly pending: RejectableTask[] = [];

  /**
   * The number of tasks currently being processed.
   */
  public runningTasks: number = 0;

  #paused: boolean = true;
  public get paused(): boolean {
    return this.#paused;
  }

  /**
   * Promise-based FIFO queue.
   * @param limit - The number of requests that can be processed at a time.
   * Default value is is no limit (`0`).
   */
  constructor(limit: number) {
    this.limit = limit;
  }

  /**
   * Pause processing. This will *not* cancel any promises that are currently
   * running.
   */
  public pause = () => {
    this.#paused = true;
  };

  /**
   * Resume processing.
   */
  public resume = () => {
    this.#paused = false;
    this.#process();
  };

  #process = () => {
    // if we aren't paused and the number of things we're processing is under
    // our limit and we have things to process: do it!
    while (
      !this.paused &&
      this.pending.length > 0 &&
      (!this.limit || this.runningTasks < this.limit)
    ) {
      const current = this.pending.shift();
      this.runningTasks++;
      current
        .execute()
        // By now, we've resolved the fn's `value` by sending it to the parent scope.
        // But over here, we're also waiting for this fn's _value_ to settle _itself_ (it might be a promise) before
        // continuing through the `pending` queue. Because we wait for it again here, it could potentially throw here,
        // in which case we just need to catch it and throw the result away. We could probably use
        // `Promise.allSettled([current()]).finally` to do this instead of the `current().catch(noop).finally`. /shrug
        .catch(noop)
        .finally(() => {
          this.runningTasks--;
          this.#process();
        });
    }
  };

  /**
   * Stop processing tasks - calls to queue(), and resume() will reject with an
   * error indicating that Ganache is disconnected. This is an irreversible
   * action. If you wish to be able to resume processing, use pause() instead.
   *
   * Note: this changes the references of this.resume and this.queue. Any code
   * that maintains references to the values referenced by this.resume or
   * this.queue, could have unintended consequences after calling this.stop().
   */
  public stop() {
    this.pause();
    this.resume = () => {
      throw new Error(
        "Cannot resume processing requests, Ganache is disconnected."
      );
    };

    this.queue = async () => {
      throw new Error("Cannot process request, Ganache is disconnected.");
    };
  }

  /**
   * Finalise shutdown of the RequestCoordinator. Rejects all pending tasks in order. Should be
   * called after all in-flight tasks have resolved in order to maintain overall FIFO order.
   */
  public end() {
    while (this.pending.length > 0) {
      this.pending
        .shift()
        .reject(new Error("Cannot process request, Ganache is disconnected."));
    }
  }

  /**
   * Insert a new function into the queue.
   */
  public queue = <T extends (...args: unknown[]) => unknown>(
    fn: T,
    thisArgument: any,
    argumentsList: OverloadedParameters<T>
  ) => {
    return new Promise<{ value: ReturnType<typeof fn> }>((resolve, reject) => {
      // const execute is `async` to force the return value into a Promise.
      const execute = async () => {
        try {
          const value = Reflect.apply(
            fn,
            thisArgument,
            argumentsList || []
          ) as ReturnType<typeof fn>;
          resolve({ value });
          return value;
        } catch (e) {
          reject(e);
        }
      };
      this.pending.push({ execute, reject });
      this.#process();
    });
  };
}
