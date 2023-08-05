import { Base } from "./base";
import {
  OptionName,
  Option,
  ExclusiveGroupIndex,
  ExclusiveGroups,
  Options,
  OptionType,
  OptionRawType
} from "./getters";

//#region options not part of exclusive groups
type UnconstrainedOptions<C extends Base.Config> = Omit<
  Options<C>,
  ExclusiveGroupOptionName<C>
>;
type UnconstrainedOptionName<C extends Base.Config> = string &
  keyof UnconstrainedOptions<C>;
type UnconstrainedOptionsByType<
  C extends Base.Config,
  T extends "type" | "rawType"
> = {
  [N in UnconstrainedOptionName<C>]: T extends "type"
    ? OptionType<C, N>
    : OptionRawType<C, N>;
};
//#endregion options not part of exclusive groups

//#region exclusive group options helpers
type ExclusiveGroupOptionPairs<
  C extends Base.Config,
  G extends unknown[]
> = G extends []
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
> = N extends OptionName<C> ? Option<C, N> : never;
type PairsToMapping<T extends unknown[]> = T extends []
  ? {}
  : T extends [[infer N, infer O], ...infer R]
  ? {
      [N_ in string & N]: O;
    } &
      PairsToMapping<R>
  : never;

type RequireOnly<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>;

type ExclusiveGroupOptionalUnionByName<
  C extends Base.Config,
  GRP extends ExclusiveGroup<C>,
  M extends OptionName<C>,
  T extends "rawType" | "type"
> = {
  [K in keyof RequireOnly<ExclusiveGroupOptionsByGroup<C, GRP>, M>]: K extends M
    ? T extends "type"
      ? OptionType<C, M>
      : OptionRawType<C, M>
    : never;
};

type Combine<
  C extends Base.Config,
  O extends unknown,
  GRP extends ExclusiveGroup<C>,
  T extends "rawType" | "type"
> = {
  [N in keyof GRP]: GRP[N] extends OptionName<C>
    ? {
        [Key in keyof (ExclusiveGroupOptionalUnionByName<C, GRP, GRP[N], T> &
          UnconstrainedOptionsByType<C, T> &
          O)]: Key extends keyof ExclusiveGroupOptionalUnionByName<
          C,
          GRP,
          GRP[N],
          T
        >
          ? ExclusiveGroupOptionalUnionByName<C, GRP, GRP[N], T>[Key]
          : Key extends keyof UnconstrainedOptionsByType<C, T>
          ? UnconstrainedOptionsByType<C, T>[Key]
          : Key extends keyof O
          ? O[Key]
          : never;
      }
    : never;
} extends { [n: number]: infer I }
  ? I
  : never;

export type ExclusiveGroupsByName<
  C extends Base.Config,
  N extends OptionName<C>,
  GRPS extends ExclusiveGroups<C> = ExclusiveGroups<C>
> = GRPS extends [infer GRP, ...infer Rest]
  ? GRP extends unknown[]
    ? N extends DeepTupleToUnion<GRP>
      ? Exclude<DeepTupleToUnion<GRP>, N>
      : Rest extends any[]
      ? ExclusiveGroupsByName<C, N, Rest>
      : never
    : never
  : never;

type IsNeverType<T> = [T] extends [never] ? true : never;
export type ExclusiveGroupUnionAndUnconstrainedPlus<
  C extends Base.Config,
  T extends "rawType" | "type",
  GRPS extends ExclusiveGroups<C> = ExclusiveGroups<C>,
  O extends unknown[] = []
> = GRPS extends [infer GRP, ...infer Rest]
  ? GRP extends ExclusiveGroup<C>
    ? Rest extends any[]
      ? O extends []
        ? // first time through
          ExclusiveGroupUnionAndUnconstrainedPlus<
            C,
            T,
            Rest,
            UnionToTuple<Combine<C, {}, GRP, T>>
          >
        : // recurse
          ExclusiveGroupUnionAndUnconstrainedPlus<
            C,
            T,
            Rest,
            UnionToTuple<
              {
                // iterate over each object in the O tuple.
                // Omit<O, keyof []> makes it include only the indexes, but
                // TypeScript will treat it as an object now, so we `UnionToTuple`
                // to turn it back into a Tuple
                [OK in keyof Omit<O, keyof []>]: Combine<C, O[OK], GRP, T>;
              } extends { [n: number]: infer I }
                ? I
                : never
            >
          >
      : never
    : never
  : O extends { [n: number]: infer I }
  ? // if there are no exclusiveGroups `I` is `never` so we return `C`
    // directly
    true extends IsNeverType<I>
    ? {
        [Key in keyof UnconstrainedOptionsByType<
          C,
          T
        >]: UnconstrainedOptionsByType<C, T>[Key];
      }
    : I
  : never;

//#region UnionToTuple
export type UnionToTuple<T> = (
  (T extends any ? (t: T) => T : never) extends infer U
    ? (U extends any ? (u: U) => any : never) extends (v: infer V) => any
      ? V
      : never
    : never
) extends (_: any) => infer W
  ? [...UnionToTuple<Exclude<T, W>>, W]
  : [];
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

type DeepTupleToUnion<T extends unknown[]> = T extends [] // empty tuple case (base case)
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
