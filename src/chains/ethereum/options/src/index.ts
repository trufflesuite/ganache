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
import { UnionToIntersection } from "./helper-types";

type EthereumConfig = {
  chain: ChainConfig;
  database: DatabaseConfig;
  logging: LoggingConfig;
  miner: MinerConfig;
  wallet: WalletConfig;
};

export const EthereumDefaults: Defaults<EthereumConfig> = {
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

export type EthereumLegacyProviderOptions = Partial<
  MakeLegacyOptions<ChainConfig> &
    MakeLegacyOptions<DatabaseConfig> &
    MakeLegacyOptions<LoggingConfig> &
    MakeLegacyOptions<MinerConfig> &
    MakeLegacyOptions<WalletConfig>
>;

export type EthereumProviderOptions = Partial<
  {
    [K in keyof EthereumConfig]: ExternalConfig<EthereumConfig[K]>;
  }
>;

export type EthereumInternalOptions = {
  [K in keyof EthereumConfig]: InternalConfig<EthereumConfig[K]>;
};

export const EthereumOptionsConfig = new OptionsConfig(EthereumDefaults);

export * from "./chain-options";
export * from "./database-options";
export * from "./helpers";
export * from "./logging-options";
export * from "./miner-options";
export * from "./wallet-options";
