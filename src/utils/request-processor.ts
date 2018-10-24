// todo: make this better
export default class RequestProcessor {
  public limit: number = 0
  public pending: any[] = [];
  public running: any[] = [];
  private _processing: boolean;
  private _paused: boolean = false;
  public get paused(): boolean {
    return this._paused;
  }

  constructor(limit?: number) {
    if(limit !== undefined) {
      if (!Number.isInteger(limit) || limit < 0 || limit > Number.MAX_SAFE_INTEGER) {
        throw new RangeError("`limit` must be an integer and between 0 - Number.MAX_SAFE_INTEGER, inclusive.")
      }
      this.limit = limit;
    }

    this.process();
  }

  public pause() {
    this._paused = true;
  }

  public resume() {
    this._paused = false;
    this.process();
  }

  private process() {
    if(this._processing) return;
    this._processing = true;

    // if we aren't paused and the number of things we're processing is under
    // our limit and we have things to process: do it!
    while(!this.paused && this.limit && this.running.length < this.limit && this.pending.length > 0) {
      let current = this.pending.shift();
      this.running.push(current);
      current().then(() => {
        this.running.slice();
      });
    }
    this._processing = false;
  }

  public queue = async function(fn: ({}) => Promise<{}>, ...args: any[]): Promise<{}> {
    const self = this;
    const executor = (resolve: (value?: {} | PromiseLike<{}>) => void, reject: (value?: {} | PromiseLike<{}>) => void) => {
      fn.apply(self, args).then(resolve);
    }
    this.pending.push(executor);
    this.process();
    return new Promise(executor);
  }
}
