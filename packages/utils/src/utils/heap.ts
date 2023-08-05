type Comparator<T> = (values: T[], a: number, b: number) => boolean;

export class Heap<T, U = any> {
  public length: number = 0;
  public array: T[] = [];
  protected less: Comparator<T>;
  protected refresher: (item: T, context: U) => void;

  /**
   * Creates a priority-queue heap where the highest priority element,
   * as determined by the `less` function, is at the tip/root of the heap.
   * To read the highest priority element without removing it call peek(). To
   * read and remove the element call `shift()`
   * @param less - the comparator function
   * @param refresher - the refresher function
   */
  constructor(less: Comparator<T>, refresher?: (item: T, context: U) => void) {
    this.less = less;
    this.refresher = refresher;
  }

  public init(array: T[]) {
    this.array = array;
    const length = (this.length = array.length);
    for (let i = ((length / 2) | 0) - 1; i >= 0; ) {
      this.down(i--, length);
    }
  }

  /**
   * Updates all entries by calling the Heap's `refresher` function for each
   * item in the heap and then re-sorting.
   * @param context -
   */
  /**
   * Updates all entries by calling the Heap's `refresher` function for each
   * item in the heap and then re-sorting.
   * @param context -
   */
  public refresh(context: U) {
    const length = this.length;
    const mid = (length / 2) | 0;
    for (let i = mid; i < length; i++) {
      this.refresher(this.array[i], context);
    }
    for (let i = mid - 1; i >= 0; ) {
      this.refresher(this.array[i], context);
      this.down(i--, length);
    }
  }

  /**
   * Pushes a new element onto the heap
   * @param value -
   */
  public push(value: T) {
    const i = this.length++;
    this.array[i] = value;
    this.up(i);
  }

  public size() {
    return this.length;
  }

  /**
   * Return the current best element. Does not remove it
   */
  public peek(): T {
    return this.array[0];
  }

  public clear() {
    this.length = this.array.length = 0;
  }

  /**
   * Removes and returns the element with the highest priority from the heap.
   * The complexity is O(log n) where n = this.size().
   * @returns the element with the highest priority. returns `undefined` if
   * there are no more elements in the heap.
   */
  public shift(): T | undefined {
    const length = this.length;

    // if we are empty or about to be empty...
    if (length <= 1) {
      if (length === 0) return;
      const element = this.array[0];
      // finally, clear the array
      this.clear();
      return element;
    }
    // otherwise...

    // remember the best element
    const array = this.array;
    const best = array[0];
    const newLength = (this.length = length - 1);
    // put our last element at the start of the heap
    array[0] = array[newLength];
    // then sort from the new first element to the second to last element
    this.down(0, newLength);
    return best;
  }

  /**
   * Removes the highest priority element from the queue, replacing it with
   * the new element. This is equivalent to, but faster than, calling
   * `replace(0, newValue);`.
   * If you call this on an empty heap (`this.size() === 0`) you may find
   * unexpected behavior.
   * @param newValue -
   */
  public replaceBest(newValue: T) {
    this.array[0] = newValue;
    this.down(0, this.length);
  }

  /**
   * Replaces the element at position `i` with the `newValue`. If the element at
   * position `i` doesn't exist, or if `i < 0` or `i > this.size()` you may
   * find unexpected behavior.
   * @param i -
   * @param newValue -
   */
  public replace(i: number, newValue: T) {
    this.array[i] = newValue;
    this.fix(i);
  }

  /**
   * Removes the element at position `i`.
   * The complexity is O(log n) where n = this.size().
   * @param i - the element to remove
   */
  public remove(i: number) {
    const newLength = --this.length;
    if (newLength !== i) {
      this.swap(i, newLength);
      if (!this.down(i, newLength)) {
        this.up(i);
      }
    }
  }

  /**
   * Removes the element with the highest priority from the heap
   * The complexity is O(log n) where n = this.size().
   * @returns `true` when there are more elements in the queue, `false` when the
   * last element was just removed. Calling `removeBest` when there are no more
   * elements in the queue will return `true`. So don't do that.
   */
  public removeBest() {
    const array = this.array;
    const length = this.length;
    if (length === 1) {
      // finally, clear the array
      this.length = array.length = 0;
      return false;
    }

    const newLength = --this.length;
    // put our last element at the start of the heap
    array[0] = array[newLength];
    // then sort from the new first element to the second to last element
    this.down(0, newLength);
    return true;
  }

  /**
   * Re-establishes the heap ordering after the element at index `i` changes
   * its value. Changing the value of the element at index `i` and then
   * calling fix is equivalent to, but faster than, calling
   * `remove(i); push(newValue);`.
   * The complexity is O(log n) where n = this.size().
   * @param i -
   */
  public fix(i: number) {
    if (!this.down(i, this.length)) {
      this.up(i);
    }
  }

  private up(j: number) {
    const less = this.less.bind(null, this.array);
    for (let i: number; (i = ((j - 1) / 2) | 0), i !== j && less(j, i); j = i) {
      this.swap(i, j);
    }
  }

  private down(i0: number, l: number): boolean {
    const less = this.less.bind(null, this.array);
    let i = i0;
    for (let j1: number; (j1 = 2 * i + 1) < l; ) {
      let j = j1; // left child
      let j2 = j1 + 1;
      if (j2 < l && less(j2, j1)) {
        j = j2; // = 2 * i + 2  // right child
      }
      if (!less(j, i)) {
        break;
      }
      this.swap(i, j);
      i = j;
    }
    return i > i0;
  }

  /**
   * Swaps the elements in the heap
   * @param i - The first element
   * @param j - The second element
   */
  private swap(i: number, j: number) {
    const array = this.array;
    const first = array[i];
    array[i] = array[j];
    array[j] = first;
  }

  /**
   * Heap initialization helper for when you only know of a single item for the
   * heap.
   * @param item -
   * @param less -
   * @param refresher -
   */
  public static from<T, U>(
    item: T,
    less: Comparator<T>,
    refresher?: (item: T, context: U) => void
  ) {
    const heap = new Heap<T, U>(less, refresher);
    heap.array = [item];
    heap.length = 1;
    return heap;
  }
}
