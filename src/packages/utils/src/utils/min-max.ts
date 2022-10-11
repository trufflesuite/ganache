/**
 * As Math.min/Math.max for number/bigint.
 * @param numbers - arbitrary length, comma separated numbers or bigints
 */
export const max = (...numbers: (number | bigint)[]): number | bigint =>
  numbers.reduce((acc, next) => (next > acc ? next : acc));

export const min = (...numbers: (number | bigint)[]): number | bigint =>
  numbers.reduce((acc, next) => (next < acc ? next : acc));
