export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type NoUnion<Key> = [Key] extends [boolean]
  ? boolean
  : [Key] extends [UnionToIntersection<Key>]
  ? Key
  : never;
