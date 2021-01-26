import { ChainConfig, ChainOptions } from "./chain-options";
import { DatabaseConfig, DatabaseOptions } from "./database-options";
import { LoggingConfig, LoggingOptions } from "./logging-options";
import { MinerConfig, MinerOptions } from "./miner-options";
import { WalletConfig, WalletOptions } from "./wallet-options";

import {
  Base,
  Defaults,
  ExternalConfig,
  InternalConfig,
  Legacy,
  LegacyOptions,
  OptionName,
  OptionRawType,
  Options,
  OptionsConfig
} from "@ganache/options";

type FilecoinConfig = {
  chain: ChainConfig;
  database: DatabaseConfig;
  logging: LoggingConfig;
  miner: MinerConfig;
  wallet: WalletConfig;
};

export const FilecoinDefaults: Defaults<FilecoinConfig> = {
  chain: ChainOptions,
  database: DatabaseOptions,
  logging: LoggingOptions,
  miner: MinerOptions,
  wallet: WalletOptions
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

export type FilecoinLegacyProviderOptions = Partial<
  MakeLegacyOptions<ChainConfig> &
    MakeLegacyOptions<LoggingConfig> &
    MakeLegacyOptions<MinerConfig> &
    MakeLegacyOptions<WalletConfig>
>;

export type FilecoinProviderOptions = Partial<
  {
    [K in keyof FilecoinConfig]: ExternalConfig<FilecoinConfig[K]>;
  }
>;

export type FilecoinInternalOptions = {
  [K in keyof FilecoinConfig]: InternalConfig<FilecoinConfig[K]>;
};

export const FilecoinOptionsConfig = new OptionsConfig(FilecoinDefaults);
