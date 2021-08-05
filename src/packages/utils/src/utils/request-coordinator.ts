import { OverloadedParameters } from "../types";

const noop = () => {};

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
  public readonly pending: ((...args: any) => Promise<any>)[] = [];

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
   * @param limit The number of requests that can be processed at a time.
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
      current()
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
   * Insert a new function into the queue.
   */
  public queue = <T extends (...args: unknown[]) => unknown>(
    fn: T,
    thisArgument: any,
    argumentsList: OverloadedParameters<T>
  ) => {
    return new Promise<{ value: ReturnType<typeof fn> }>((resolve, reject) => {
      // const executor is `async` to force the return value into a Promise.
      const executor = async () => {
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
      this.pending.push(executor);
      this.#process();
    });
  };
}
