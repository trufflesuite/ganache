type TuplePrepend<Tuple extends readonly unknown[], NewElement> = [
  NewElement,
  ...Tuple
];

type Consumer<Value> = (value: Value) => void;

type IntersectionFromUnion<Union> = (
  Union extends unknown ? Consumer<Union> : never
) extends Consumer<infer ResultIntersection>
  ? ResultIntersection
  : never;

type OverloadedConsumerFromUnion<Union> = IntersectionFromUnion<
  Union extends unknown ? Consumer<Union> : never
>;

type UnionLast<Union> = OverloadedConsumerFromUnion<Union> extends (
  a: infer A
) => void
  ? A
  : never;

type UnionExcludingLast<Union> = Exclude<Union, UnionLast<Union>>;

type TupleFromUnionRec<
  RemainingUnion,
  CurrentTuple extends readonly unknown[]
> = [RemainingUnion] extends [never]
  ? CurrentTuple
  : TupleFromUnionRec<
      UnionExcludingLast<RemainingUnion>,
      TuplePrepend<CurrentTuple, UnionLast<RemainingUnion>>
    >;

export type TupleFromUnion<Union> = TupleFromUnionRec<Union, []>;
