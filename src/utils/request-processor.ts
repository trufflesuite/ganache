export default class RequestProcessor {
  /**
   * The number of concurrent requests. Set to null for no limit.
   */
  public limit: number = null;

  /**
   * The pending requests. You can't do anything with this array.
   */
  public readonly pending: any[] = [];
  /**
   * The number of tasks currently being processed.
   */
  public runningTasks: number = 0;
  private _paused: boolean = true;
  public get paused(): boolean {
    return this._paused;
  }

  /**
   * Promise-based FIFO queue.
   * @param limit The number of requests that can be processed at a time. 
   * Default value is is no limit (via `null`).
   */
  constructor(limit: number = null) {
    if (limit !== null) {
      if (!Number.isInteger(limit) || limit < 0 || limit > Number.MAX_SAFE_INTEGER) {
        throw new RangeError("`limit` must be an integer and between 0 - Number.MAX_SAFE_INTEGER, inclusive.")
      }
      this.limit = limit;
    }

    this.process();
  }

  /**
   * Pause processing. This will *not* cancel or promises that are currently
   * running.
   */
  public pause() {
    this._paused = true;
  }

  /**
   * Resume processing.
   */
  public resume() {
    this._paused = false;
    this.process();
  }

  private process() {
    // if we aren't paused and the number of things we're processing is under
    // our limit and we have things to process: do it!
    while (!this.paused && this.pending.length > 0 && (!this.limit || this.runningTasks < this.limit)) {
      const current = this.pending.shift();
      this.runningTasks++;
      current().finally(() => {
        this.runningTasks--;
      });
    }
  }

  /**
   * Insert a new function into the queue.
   */
  public queue = function(fn: (...args: any[]) => Promise<{}>, ...args: any[]): Promise<{}> {
    const promise = new Promise((resolve: (value?: {} | PromiseLike<{}>) => void, reject: (value?: {} | PromiseLike<{}>) => void) => {
      const executor = () => {
        return fn.apply(null, args).then(resolve).catch(reject);
      }
      this.pending.push(executor);
      this.process();
    });
    return promise;
  }
}
