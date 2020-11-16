export default class Entry<T> {
  public readonly promise: Promise<T>;
  public resolve: (value: T | PromiseLike<T>) => void;

  public value: T | Promise<T>;
  public queue: Entry<T>[];

  public resolved = false;
  public onSetteled: (queue: Entry<T>[], entry: Entry<T>) => void;

  constructor(
    promise: Promise<T>,
    queue: Entry<T>[],
    onSetteled: (queue: Entry<T>[], entry: Entry<T>) => void
  ) {
    this.value = promise;
    this.queue = queue;
    this.onSetteled = onSetteled;
    const _onSetteled = () => this.onSetteled(this.queue, this);
    promise.then(_onSetteled, _onSetteled);
    this.promise = new Promise<T>(resolve => {
      this.resolve = resolve;
    });
  }
}
