import { Base } from "./base";
import { ExclusiveGroupUnionAndUnconstrainedPlus } from "./exclusive";
import {
  Legacy,
  OptionHasDefault,
  OptionHasLegacy,
  OptionName,
  OptionRawType,
  OptionType
} from "./getters";

//#region Definition helpers
type Normalize<
  C extends Base.Config,
  N extends OptionName<C> = OptionName<C>
> = (rawInput: OptionRawType<C, N>) => OptionType<C, N>;

export type ExternalConfig<C extends Base.Config> = Partial<
  ExclusiveGroupUnionAndUnconstrainedPlus<C, "rawType">
>;

export type InternalConfig<
  C extends Base.Config
> = ExclusiveGroupUnionAndUnconstrainedPlus<C, "type">;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

export type Definitions<C extends Base.Config> = {
  [N in OptionName<C>]: {
    readonly normalize: Normalize<C, N>;
  } & (void extends OptionHasDefault<C, N>
    ? {}
    : { readonly default: (config: InternalConfig<C>) => OptionType<C, N> }) &
    (void extends OptionHasLegacy<C, N>
      ? {}
      : {
          readonly legacyName: UnionToIntersection<keyof Legacy<C, N>>;
        });
};
//#endregion Definition helpers
