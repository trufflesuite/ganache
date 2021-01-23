import { Base } from "./base";

//#region getters for buckets
export type Options<C extends Base.Config> = C["options"];
export type ExclusiveGroups<C extends Base.Config> = C["exclusiveGroups"];
//#endregion

//#region getters for keys
export type OptionName<C extends Base.Config> = keyof Options<C> & string;
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

export type OptionCliType<
  C extends Base.Config,
  N extends OptionName<C> = OptionName<C>
> = void extends Option<C, N>["cliType"]
  ? Option<C, N>["type"]
  : Option<C, N>["cliType"];

export type OptionType<
  C extends Base.Config,
  N extends OptionName<C> = OptionName<C>
> = Option<C, N>["type"];

export type OptionHasDefault<
  C extends Base.Config,
  N extends OptionName<C> = OptionName<C>
> = Option<C, N>["hasDefault"];

export type OptionHasCliType<
  C extends Base.Config,
  N extends OptionName<C> = OptionName<C>
> = Option<C, N>["cliType"];

export type OptionHasLegacy<
  C extends Base.Config,
  N extends OptionName<C> = OptionName<C>
> = Option<C, N>["legacy"];

export type LegacyOptions<C extends Base.Config> = {
  [K in OptionName<C>]: Option<C, K> extends { legacy: any } ? K : never;
}[OptionName<C>];

export type Legacy<C extends Base.Config, N extends OptionName<C>> = Option<
  C,
  N
>["legacy"];

//#endregion getters for option
