export default class Queue {
  private queue: Array<any>
  public get length(): number {
      return this.queue.length;
  }
  constructor() {

  }
  public push(args): Promise<any>{
    return new Promise((resolve, reject) => {
      resolve();
    });
    setImmediate()
  }
}
