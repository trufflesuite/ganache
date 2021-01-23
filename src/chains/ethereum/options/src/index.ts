import { ChainConfig, ChainOptions } from "./chain-options";
import { DatabaseConfig, DatabaseOptions } from "./database-options";
import { LoggingConfig, LoggingOptions } from "./logging-options";
import { MinerConfig, MinerOptions } from "./miner-options";
import { WalletConfig, WalletOptions } from "./wallet-options";
import { ForkConfig, ForkOptions } from "./fork-options";
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
import { UnionToIntersection } from "./helper-types";

export type EthereumOptions = {
  chain: ChainConfig;
  database: DatabaseConfig;
  logging: LoggingConfig;
  miner: MinerConfig;
  wallet: WalletConfig;
  fork: ForkConfig;
};

type MakeLegacyOptions<C extends Base.Config> = UnionToIntersection<
  {
    [K in OptionName<C>]: K extends LegacyOptions<C>
      ? Legacy<C, K>
      : Record<K, OptionRawType<C, K>>;
  }[OptionName<C>]
>;

export type EthereumLegacyOptions = Partial<
  MakeLegacyOptions<ChainConfig> &
    MakeLegacyOptions<DatabaseConfig> &
    MakeLegacyOptions<LoggingConfig> &
    MakeLegacyOptions<MinerConfig> &
    MakeLegacyOptions<WalletConfig> &
    MakeLegacyOptions<ForkConfig>
>;

export type EthereumProviderOptions = Partial<
  {
    [K in keyof EthereumOptions]: ExternalConfig<EthereumOptions[K]>;
  }
>;

export type EthereumInternalOptions = {
  [K in keyof EthereumOptions]: InternalConfig<EthereumOptions[K]>;
};

export type EthereumDefaults = {
  [K in keyof EthereumOptions]: Definitions<EthereumOptions[K]>;
};

export const ethereumDefaults: Defaults<EthereumOptions> = {
  chain: ChainOptions,
  database: DatabaseOptions,
  logging: LoggingOptions,
  miner: MinerOptions,
  wallet: WalletOptions,
  fork: ForkOptions
};

export const EthereumOptionsConfig = new OptionsConfig(ethereumDefaults);

export * from "./chain-options";
export * from "./database-options";
export * from "./helpers";
export * from "./logging-options";
export * from "./miner-options";
export * from "./wallet-options";
export * from "./fork-options";
