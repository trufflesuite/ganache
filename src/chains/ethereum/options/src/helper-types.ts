export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type Writeable<T> = { -readonly [P in keyof T]: T[P] };
export type ArrayToTuple<T extends Readonly<string[]>> = T[number];
