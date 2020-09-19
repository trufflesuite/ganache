import {Base} from "./base";
import { OptionHasDefault, OptionName, OptionRawType, OptionType } from "./getters";

//#region Definition helpers
type Normalize<
  C extends Base.Config,
  N extends OptionName<C> = OptionName<C>
> = (rawInput: OptionRawType<C, N>) => OptionType<C, N>;

type InternalConfig<
  C extends Base.Config,
> = {[N in OptionName<C>]: OptionRawType<C, N>};

export type Definitions<C extends Base.Config> = {
  [N in OptionName<C>]: {
    normalize?: Normalize<C, N>;
  } & (
    void extends OptionHasDefault<C, N>
      ? {}
      : { default: (config: InternalConfig<C>) => OptionRawType<C, N> }
  );
}
//#endregion Definition helpers