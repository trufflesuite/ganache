import { ChainConfig, ChainOptions } from "./chain-options";
import { LoggingConfig, LoggingOptions } from "./logging-options";
import { MinerConfig, MinerOptions } from "./miner-options";
import { WalletConfig, WalletOptions } from "./wallet-options";

import {
  Base,
  Defaults,
  Definitions,
  ExternalConfig,
  InternalConfig,
  Legacy,
  LegacyOptions,
  OptionName,
  OptionRawType,
  Options,
  OptionsConfig
} from "@ganache/options";

export type FilecoinOptions = {
  chain: ChainConfig;
  logging: LoggingConfig;
  miner: MinerConfig;
  wallet: WalletConfig;
};

type MakeLegacyOptions<C extends Base.Config> = UnionToIntersection<
  {
    [K in OptionName<C>]: K extends LegacyOptions<C>
      ? Legacy<C, K>
      : Record<K, OptionRawType<C, K>>;
  }[keyof Options<C>]
>;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

export type FilecoinLegacyOptions = Partial<
  MakeLegacyOptions<ChainConfig> &
    MakeLegacyOptions<LoggingConfig> &
    MakeLegacyOptions<MinerConfig> &
    MakeLegacyOptions<WalletConfig>
>;

export type FilecoinProviderOptions = Partial<
  {
    [K in keyof FilecoinOptions]: ExternalConfig<FilecoinOptions[K]>;
  }
>;

export type FilecoinInternalOptions = {
  [K in keyof FilecoinOptions]: InternalConfig<FilecoinOptions[K]>;
};

export type FilecoinDefaults = {
  [K in keyof FilecoinOptions]: Definitions<FilecoinOptions[K]>;
};

export const filecoinDefaults: Defaults<FilecoinOptions> = {
  chain: ChainOptions,
  logging: LoggingOptions,
  miner: MinerOptions,
  wallet: WalletOptions
};

export const FilecoinOptionsConfig = new OptionsConfig(filecoinDefaults);
