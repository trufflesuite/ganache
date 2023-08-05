type BuildPowersOf2LengthArrays<
  N extends number,
  R extends never[][]
> = R[0][N] extends never
  ? R
  : BuildPowersOf2LengthArrays<N, [[...R[0], ...R[0]], ...R]>;

type ConcatLargestUntilDone<
  N extends number,
  R extends never[][],
  B extends never[]
> = B["length"] extends N
  ? B
  : [...R[0], ...B][N] extends never
  ? ConcatLargestUntilDone<
      N,
      R extends [R[0], ...infer U] ? (U extends never[][] ? U : never) : never,
      B
    >
  : ConcatLargestUntilDone<
      N,
      R extends [R[0], ...infer U] ? (U extends never[][] ? U : never) : never,
      [...R[0], ...B]
    >;

/**
 * Replaces the types in the Tuple, `R`, with type `T`
 */
type Replace<R extends any[], T> = { [K in keyof R]: T };

/**
 * Creates a Tuple type of length `N` and type `T`.
 */
type TupleOf<T, N extends number> = number extends N
  ? T[]
  : {
      [K in N]: BuildPowersOf2LengthArrays<K, [[never]]> extends infer U
        ? U extends never[][]
          ? Replace<ConcatLargestUntilDone<K, U, []>, T>
          : never
        : never;
    }[N];

/**
 * Returns all but the last element from `T`
 */
type Head<T extends any[]> = T extends [...infer Head, any] ? Head : any[];

export type RangeOfInclusive<To extends number> = Partial<
  TupleOf<unknown, To>
>["length"];

type UnionToTuple<T> = (
  (T extends any ? (t: T) => T : never) extends infer U
    ? (U extends any ? (u: U) => any : never) extends (v: infer V) => any
      ? V
      : never
    : never
) extends (_: any) => infer W
  ? [...UnionToTuple<Exclude<T, W>>, W]
  : [];

/**
 * Generates a unioned range of numbers from 0 to `To`
 */
export type RangeOf<To extends number> = Partial<
  Head<TupleOf<unknown, To>>
>["length"];

/**
 * Given a length, computes the union of all lengths after the
 * index.
 *
 *
 * @example
 * ```typescript
 * function slice<T extends unknown[], Size extends number = RangeOf<T["length"]>>(
 *  tuple: T,
 *   index: Size,
 *   length: Remainders<T["length"], typeof index>
 * ) {
 *   return tuple.slice(index, index + length);
 * }
 * const tuple: TupleOf<number, 5> = [1, 2, 3, 4, 5];
 * slice(tuple, 0, 6);
 *                 ^ // Argument of type '6' is not assignable to parameter of type '0 | 1 | 2'
 * ```
 *
 * @implementation
 *  1. generate a union of the numbers 0..Length and 0..Index
 *  2. exclude from the range `0..Length` all numbers that are also in `0..Index`
 *  3. convert the remining union into a tuple so we can count the remaining numbers
 *  4. Use `Partial<Tuple>["length"]` to compute the union of all possible Tuple lengths
 *  5. Make sure TypeScript remembers that we are a number (`& number`)
 */
export type Remainders<Length extends number, Index extends number> =
  // `Partial<Tuple>["length"]` computes the union of all possible Tuple lengths
  Partial<
    // convert the union of remaining  into a tuple so we can count how many we have left
    UnionToTuple<
      // Exclude from the range `0..Length` the numbers thath are also in `0..Index`
      Exclude<RangeOfInclusive<Length>, RangeOfInclusive<Index>>
    >
  >["length"] &
    number;
