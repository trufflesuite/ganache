import Emittery from "emittery";
import Entry from "./src/entry";

const emitteryMethods = ["emit", "once"] as const;

/**
 * Creates a FIFO queue that ensures promises are _resolved_ in the order
 * they were added.
 *
 * This is different than a FIFO queue that _executes_ functions that
 * return promises; this queue is for the promises themselves.
 *
 * @example
 * ```javascript
 * const queue = new PromiseQueue();
 *
 * const slow = new Promise(resolve => setTimeout(resolve, 1000, "slow"));
 * const fast = Promise.resolve("fast");
 *
 * await Promise.race([
 *   queue.add(slow),
 *   queue.add(fast)
 * ]); // returns "slow"
 *
 * // Additionally, the queued promise chain can be cleared via `queue.clear(value)`.
 * // This will cause the chain of promises to all resolve immediately with the
 * // given value. *
 * //
 * // * note: whatever the promise starting doing when it was created will still
 * // happen, no promises are aborted; rather, the return value is ignored.
 * ```
 */
@Emittery.mixin(Symbol.for("emittery"), emitteryMethods)
class PromiseQueue<T> {
  /**
   * Returns true if there are promises pending in the queue
   */
  public isBusy() {
    return this.#queue.length !== 0;
  }

  // TODO(perf): a singly linked list is probably a better option here
  readonly #queue: Entry<T>[] = [];

  #tryResolve = (queue: Entry<T>[], entry: Entry<T>) => {
    // if this is now the highest priority entry, resolve the outer
    // Promise
    if (entry === queue[0]) {
      queue.shift();
      entry.resolve(entry.value);
      // then try resolving the rest
      this.#tryResolveChain(queue);
    } else {
      entry.resolved = true;
    }
  };

  /**
   * Adds the promise to the end of the queue.
   * @param promise -
   * @returns a promise that resolves with the given promise's result. If the
   * queue was `clear`ed before the promise could be shifted off the return
   * value will be the `value` passed to `clear`.
   */
  add(promise: Promise<T>) {
    const queue = this.#queue;
    const entry: Entry<T> = new Entry(promise, queue, this.#tryResolve);
    queue.push(entry);
    return entry.promise;
  }

  /**
   * Clears all promises from the queue and sets their resolved values to the
   * given value.
   */
  clear(value: T) {
    // remove all entries from the queue and mark them.
    const cancelledQueue = this.#queue.splice(0);
    cancelledQueue.forEach(entry => {
      entry.queue = cancelledQueue;
      entry.value = value;
    });
  }

  /**
   * Removes all _resolved_ promises from the front of the chain of promises.
   */
  #tryResolveChain = (queue: Entry<T>[]) => {
    let first = queue[0];
    while (first && first.resolved) {
      queue.shift();
      first.resolve(first.value);
      first = queue[0];
    }

    // if there is nothing left to do emit `"idle"`
    if (queue.length === 0) {
      this.emit("idle");
    }
  };
}

interface PromiseQueue<T>
  extends Pick<Emittery, typeof emitteryMethods[number]> {
  emittery: Emittery;
}

export default PromiseQueue;
