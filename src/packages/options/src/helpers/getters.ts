import { Base } from "./base";

//#region getters for buckets
export type Options<C extends Base.Config> = C["options"];
export type ExclusiveGroups<C extends Base.Config> = C["exclusiveGroups"];
//#endregion

//#region getters for keys
export type OptionName<C extends Base.Config> = string & keyof Options<C>;
export type ExclusiveGroupIndex<C extends Base.Config> = number &
  keyof ExclusiveGroups<C>;
//#endregion

//#region getters for individual things
export type Option<
  C extends Base.Config,
  N extends OptionName<C> = OptionName<C>
> = Options<C>[N];
//#endregion

//#region getters for option
export type OptionRawType<
  C extends Base.Config,
  N extends OptionName<C> = OptionName<C>
> = void extends Option<C, N>["rawType"]
  ? Option<C, N>["type"]
  : Option<C, N>["rawType"];

export type OptionType<
  C extends Base.Config,
  N extends OptionName<C> = OptionName<C>
> = Option<C, N>["type"];

export type OptionHasDefault<
  C extends Base.Config,
  N extends OptionName<C> = OptionName<C>
> = Option<C, N>["hasDefault"];
//#endregion getters for option
