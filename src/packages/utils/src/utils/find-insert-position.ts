/**
 * AKA `upper_bound`
 *
 * The elements are compared using `comp`. The elements in the range must
 * already be sorted according to this same criterion (`comp`), or at least
 * partitioned with respect to val.
 *
 * The function optimizes the number of comparisons performed by comparing
 * non-consecutive elements of the sorted range.
 *
 * The index into the `array` returned by this function will always be greater than
 * the index of the last-occurrence of `val`.
 *
 * On average, logarithmic in the distance of the length of the array: Performs
 * approximately `log2(N)+1` element comparisons (where `N` is this length).
 *
 * @param array -
 * @param val - Value of the upper bound to search for in the range.
 * @param comp - A function that accepts two arguments (the first is always
 * `val`, and the second from the given `array`) and returns bool. The value
 * returned indicates whether the first argument is considered to go before the
 * second.
 *
 * @returns The index to the upper bound position for `val` in the range. If no
 * element in the range compares greater than `val`, the function returns
 * `array.length`.
 */
export function findInsertPosition<T>(
  array: T[],
  val: T,
  comp: (a: T, b: T) => boolean
): number {
  // `count` tracks the number of elements that remain to be searched
  let count = array.length;
  // `insertPosition` tracks the best insert position for the element we know
  // about _so far_
  let insertPosition = 0;
  // `offset` tracks the start position of the elements that remain to be
  // searched
  let offset = 0;
  while (count > 0) {
    // find the middle element between `offset` and `count`
    const step = (count / 2) | 0; // ()`| 0` rounds towards 0)
    offset += step;

    // compare our val to the "middle element" (`array[offset]`)
    if (!comp(val, array[offset])) {
      // `val` should come _after_ the element at `array[offset]`.
      //  * update our `insertPosition` to the index immediately after
      //    `array[offset]`
      //  * shrink our search range
      // This narrows our search the elements to the right of `array[offset]`.
      insertPosition = ++offset;
      count -= step + 1;
    } else {
      // `val` should come before the element at `array[offset]`:
      // This narrows the search the elements to the left of `array[offset]`.
      count = step;
      offset = insertPosition;
    }
  }
  return insertPosition;
}
