import {Base} from "./base";
import {OptionName, Option, ExclusiveGroupIndex, ExclusiveGroups, Options, OptionType} from "./getters";


//#region options not part of exclusive groups
export type UnconstrainedOptions<C extends Base.Config> = Omit<Options<C>, ExclusiveGroupOptionName<C>>;
export type UnconstrainedOptionRawTypes<C extends Base.Config> = {[N in UnconstrainedOptionName<C>]: OptionType<C, N>};
export type UnconstrainedOptionName<C extends Base.Config> = string & keyof UnconstrainedOptions<C>;
//#endregion options not part of exclusive groups


//#region exclusive group options helpers
type ExclusiveGroupOptionPairs<
  C extends Base.Config,
  G extends unknown[]
> =
  G extends []
    ? []
    : G extends [infer N, ...infer R]
      ? [
        [N, ExclusiveGroupOptionNameOption<C, N>],
        ...ExclusiveGroupOptionPairs<C, R>
      ]
      : never;

type ExclusiveGroupOptionNameOption<
  C extends Base.Config,
  N
> =
  N extends OptionName<C>
    ? Option<C, N>
    : never;

type PairsToMapping<T extends unknown[]> =
  T extends []
    ? {}
    : T extends [[infer N, infer O], ...infer R]
      ? {
        [N_ in string & N]: O;
      } & PairsToMapping<R>
      : never;

type RequireOnly<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>

type ExclusiveGroupOptionalUnionByName<C extends Base.Config, GRP extends ExclusiveGroup<C>, M extends OptionName<C>> = 
{
  [K in keyof RequireOnly<ExclusiveGroupOptionsByGroup<C, GRP>, M>] : K extends M ? OptionType<C, M>
    : never
}

type Combine<C extends Base.Config, O extends unknown, GRP extends ExclusiveGroup<C>> = {
    [N in keyof GRP]:
      GRP[N] extends OptionName<C>
        ? {
          [
            Key in keyof (
              & ExclusiveGroupOptionalUnionByName<C, GRP, GRP[N]>
              & UnconstrainedOptionRawTypes<C>
              & O
            )
          ]: Key extends keyof ExclusiveGroupOptionalUnionByName<C, GRP, GRP[N]>
              ? ExclusiveGroupOptionalUnionByName<C, GRP, GRP[N]>[Key]
              : Key extends keyof UnconstrainedOptionRawTypes<C>
                ? UnconstrainedOptionRawTypes<C>[Key]
                : Key extends keyof O
                  ? O[Key]
                  : never;
            
        }
      : never;
  } extends {[n:number]: infer I} ? I : never;


export type ExclusiveGroupUnionAndUnconstrainedPlus<C extends Base.Config, GRPS extends ExclusiveGroups<C> = ExclusiveGroups<C>, O extends unknown[] = []> = (
  GRPS extends [infer GRP, ...infer Rest]
    ? GRP extends ExclusiveGroup<C>
      ? Rest extends any[]
        ? O extends []
          // first time through
          ? ExclusiveGroupUnionAndUnconstrainedPlus<C, Rest, UnionToTuple<Combine<C, {}, GRP>>>
          // recurse
          : ExclusiveGroupUnionAndUnconstrainedPlus<C, Rest, UnionToTuple<{
              // iterate over each object in the O tuple.
              // Omit<O, keyof []> makes it include only the indexes, but TypeScript will treat it as an object now, so we `UnionToTuple`
              // to turn it back into a Tuple
              [OK in keyof Omit<O, keyof []>]: Combine<C, O[OK], GRP>
          } extends {[n:number]: infer I} ? I : never>>
        : never
      : never
    : O extends {[n:number]: infer I} ? I : never
)

//#region UnionToTuple
type TuplePrepend<Tuple extends readonly unknown[], NewElement> =
[NewElement, ...Tuple]

type Consumer<Value> = (value: Value) => void;

type IntersectionFromUnion<Union> =
(Union extends unknown ? Consumer<Union> : never) extends (Consumer<infer ResultIntersection>)
? ResultIntersection
: never;

type OverloadedConsumerFromUnion<Union> = IntersectionFromUnion<Union extends unknown ? Consumer<Union> : never>;

type UnionLast<Union> = OverloadedConsumerFromUnion<Union> extends ((a: infer A) => void) ? A : never;

type UnionExcludingLast<Union> = Exclude<Union, UnionLast<Union>>;

type TupleFromUnionRec<RemainingUnion, CurrentTuple extends readonly unknown[]> =
[RemainingUnion] extends [never]
? CurrentTuple
: TupleFromUnionRec<UnionExcludingLast<RemainingUnion>, TuplePrepend<CurrentTuple, UnionLast<RemainingUnion>>>;

export type UnionToTuple<Union> = TupleFromUnionRec<Union, []>;
//#endregion

//#endregion exclusive group options helpers



//#region exclusive groups
type ExclusiveGroup<
  C extends Base.Config,
  K extends ExclusiveGroupIndex<C> = ExclusiveGroupIndex<C>
> = ExclusiveGroups<C>[K];

type ExclusiveGroupOptionName<
  C extends Base.Config,
  K extends ExclusiveGroupIndex<C> = ExclusiveGroupIndex<C>
> = Extract<OptionName<C>, DeepTupleToUnion<ExclusiveGroup<C, K>>>;

type DeepTupleToUnion<T extends unknown[]> =
  T extends [] // empty tuple case (base case)
    ? never
    : T extends [infer N, ...infer R] // inductive case
      ? N extends unknown[]
        ? DeepTupleToUnion<N> | DeepTupleToUnion<R>
        : N | DeepTupleToUnion<R>
      : never; // we should never hit this case
//#endregion exclusive groups


//#region options separated by exclusive group
type ExclusiveGroupOptionsByGroup<
  C extends Base.Config,
  G extends ExclusiveGroup<C>
> = PairsToMapping<ExclusiveGroupOptionPairs<C, G>>;
//#endregion
