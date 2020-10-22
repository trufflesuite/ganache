/**
 * calls the callback when the promise is resolved or rejected.
 * 
 * This is different than use just `finally` in that we handle promise rejection
 * 
 * @param promise 
 * @param callback 
 */
function settled(promise: Promise<any>, callback: () => void){
  promise.then(callback, callback);
}

/**
 * Creates a FIFO queue to that ensures promises are _resolved_ in the order
 * they were added.
 * 
 * This is different than a FIFO queue that _executes_ functions that
 * return promises; this queue is for the promises themselves.
 * 
 * @example
 * const queue = new PromiseQueue();
 * 
 * const prom1 = new Promise(resolve => setTimeout(resolve, 1000, "slow"));
 * const prom2 = Promise.resolve("fast");
 * 
 * await Promise.race([
 *   queue.add(prom1),
 *   queue.add(prom2)
 * ]); // "slow"
 * 
 * Additionally, the queued promise chain can be cleared via `queue.clear()`.
 * This will cause the chain of promises to all resolve immediately with a value
 * of `null`. *
 * 
 * * note: whatever the promise starting doing when it was created will still
 * happen, no promises are aborted; rather, they are ignored.
 */
export class PromiseQueue {
  // TODO(perf): a singly linked list is probably a better option here
  readonly #queue: {
    value: Promise<any> | null,
    resolve: any,
    resolved: boolean
  }[] = [];

  add<T>(promise: Promise<T>) {
    return new Promise<T>(resolve => {
      const element = {value: promise, resolve, resolved: false};
      const q = this.#queue;
      q.push(element);
      settled(promise, () => {
        // if this is now the highest priority element, resolve the outer
        // Promise then try resolving the rest
        if (q[0] === element) {
          q.shift();

          // Note: element.promise might not be the original `promise` here; the
          // `clear` method may have changed it!
          resolve(element.value);

          this.#tryResolveChain();
        } else {
          element.resolved = true;
        }
      });
    });
  }

  /**
   * Clears all promises from the queue and sets their resolved values to `null`
   */
  clear() {
    let element = this.#queue.shift();

    // remove all elements from the queue and mark them.
    while (element) {
      // override the value that gets returned with `null`
      element.value = null;

      element = this.#queue.shift();
    }
  }

  /**
   * Removes all _resolved_ promises from the front of the chain of promises.
   */
  #tryResolveChain = () => {
    const q = this.#queue;
    let first = q[0];
    while (first && first.resolved) {
      q.shift();
      first.resolve(first.value);
      first = q[0];
    }
  }
}
