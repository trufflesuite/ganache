/**
 * Returns the largest of the numbers/bigints given as input parameters. Throws if no values are given.
 * @param numbers One or more numbers and/or bigints among which the largest value will be selected and returned.
 */
export const max = (...numbers: (number | bigint)[]): number | bigint =>
  numbers.reduce((acc, next) => (next > acc ? next : acc));

/**
 * Returns the smallest of the numbers/bigints given as input parameters. Throws if no values are given.
 * @param numbers One or more numbers and/or bigints among which the smallest value will be selected and returned.
 */
export const min = (...numbers: (number | bigint)[]): number | bigint =>
  numbers.reduce((acc, next) => (next < acc ? next : acc));
