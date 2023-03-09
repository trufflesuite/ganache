import { Base, CliTypeMap, CliTypes } from "./base";
import {
  ExclusiveGroupsByName,
  ExclusiveGroupUnionAndUnconstrainedPlus
} from "./exclusive";
import {
  Legacy,
  OptionCliType,
  OptionHasCliType,
  OptionHasDefault,
  OptionHasLegacy,
  OptionName,
  OptionRawType,
  OptionType
} from "./getters";
import { UnionToIntersection } from "./types";

//#region Definition helpers
type Normalize<
  C extends Base.Config,
  N extends OptionName<C> = OptionName<C>
> = (
  rawInput: OptionRawType<C, N>,
  config: Readonly<InternalConfig<C>>
) => OptionType<C, N>;

export type ExternalConfig<C extends Base.Config> = Partial<
  ExclusiveGroupUnionAndUnconstrainedPlus<C, "rawType">
>;

export type InternalConfig<C extends Base.Config> =
  ExclusiveGroupUnionAndUnconstrainedPlus<C, "type">;

export type Definitions<C extends Base.Config> = {
  [N in OptionName<C>]: {
    readonly normalize: Normalize<C, N>;
    readonly cliDescription: string;
    readonly disableInCLI?: boolean;
    readonly cliAliases?: string[];
    readonly cliChoices?: string[] | number[];
    readonly implies?: ReadonlyArray<Exclude<OptionName<C>, N>>;
    // exclusiveGroups (conflicts)
  } & (C[ExclusiveGroupsByName<C, N>] extends never
    ? {}
    : {
        readonly conflicts: ExclusiveGroupsByName<C, N>[];
      }) &
    // cliType
    (void extends OptionHasCliType<C, N>
      ? {
          readonly cliType?: CliTypeMap<CliTypes> | null;
        }
      : {
          readonly cliType?: CliTypeMap<OptionCliType<C, N>> | null;
          readonly cliCoerce?: (
            cliType: OptionCliType<C, N>
          ) => OptionRawType<C, N>;
        }) &
    // hasDefault
    (void extends OptionHasDefault<C, N>
      ? {}
      : {
          // using type string for flavor to prevent circular dependency
          readonly default: (
            config: InternalConfig<C>,
            flavor: string
          ) => OptionType<C, N>;
          readonly defaultDescription?: string;
        }) &
    // hasLegacy
    (void extends OptionHasLegacy<C, N>
      ? {}
      : {
          readonly legacyName: UnionToIntersection<keyof Legacy<C, N>>;
        });
};
//#endregion Definition helpers
