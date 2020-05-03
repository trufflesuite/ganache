export default class RequestCoordinator {
  /**
   * The number of concurrent requests. Set to null for no limit.
   */
  public limit: number;

  /**
   * The pending requests. You can't do anything with this array.
   */
  public readonly pending: any[] = [];

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
    this.#process();
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
    while (!this.paused && this.pending.length > 0 && (!this.limit || this.runningTasks < this.limit)) {
      const current = this.pending.shift();
      this.runningTasks++;
      current().finally(() => {
        this.runningTasks--;
        this.#process();
      });
    }
  };

  /**
   * Insert a new function into the queue.
   */
  public queue = (fn: (...args: any[]) => Promise<any>, ...args: any[]): Promise<any> => {
    const promise = new Promise(
      (resolve: (value?: {} | PromiseLike<{}>) => void, reject: (value?: {} | PromiseLike<{}>) => void) => {
        const executor = () => {
          return fn.apply(null, args).then(resolve).catch(reject);
        };
        this.pending.push(executor);
        this.#process();
      }
    );
    return promise;
  };
}
