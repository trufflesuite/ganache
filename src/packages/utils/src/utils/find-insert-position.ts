/**
 * AKA `upper_bound`
 *
 * The elements are compared `comp`. The elements in the range shall already be
 * sorted according to this same criterion (`comp`), or at least partitioned
 * with respect to val.
 *
 * The function optimizes the number of comparisons performed by comparing
 * non-consecutive elements of the sorted range.
 *
 * The index into the `array` returned by this function cannot be equivalent to
 * `val`, only greater.
 *
 * On average, logarithmic in the distance of the length of the array: Performs
 * approximately `log2(N)+1` element comparisons (where `N` is this length).
 *
 * @param array
 * @param val Value of the upper bound to search for in the range.
 * @param comp A function that accepts two arguments (the first is always
 * `val`, and the second from the given `array`, and returns bool. The value
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
  let count = array.length;

  let first = 0;
  let offset = 0;
  while (count > 0) {
    let step = (count / 2) | 0;
    offset += step;
    if (!comp(val, array[offset])) {
      first = ++offset;
      count -= step + 1;
    } else {
      count = step;
      offset = first;
    }
  }
  return first;
}
