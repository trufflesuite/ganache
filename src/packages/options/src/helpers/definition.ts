import { Base } from "./base";
import { ExclusiveGroupUnionAndUnconstrainedPlus } from "./exclusive";
import { OptionHasDefault, OptionName, OptionRawType, OptionType } from "./getters";

//#region Definition helpers
type Normalize<C extends Base.Config, N extends OptionName<C> = OptionName<C>> = (
  rawInput: OptionRawType<C, N>
) => OptionType<C, N>;

export type ExternalConfig<C extends Base.Config> = Partial<ExclusiveGroupUnionAndUnconstrainedPlus<C, "rawType">>;

export type InternalConfig<C extends Base.Config> = ExclusiveGroupUnionAndUnconstrainedPlus<C, "type">;

export type Definitions<C extends Base.Config> = {
  [N in OptionName<C>]: {
    normalize: Normalize<C, N>;
    legacyName?: string;
  } & (void extends OptionHasDefault<C, N> ? {} : { default: (config: InternalConfig<C>) => OptionType<C, N> });
};
//#endregion Definition helpers
