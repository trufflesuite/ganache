import { ChainConfig, ChainOptions } from "./chain-options";
import { DatabaseConfig, DatabaseOptions } from "./database-options";
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

export type EthereumOptions = {
  chain: ChainConfig;
  database: DatabaseConfig;
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

type g = Partial<
  {
    [K in keyof UnionToIntersection<
      MakeLegacyOptions<WalletConfig>
    >]: UnionToIntersection<MakeLegacyOptions<WalletConfig>>[K];
  }
>;

export type EthereumLegacyOptions = Partial<
  MakeLegacyOptions<ChainConfig> &
    MakeLegacyOptions<DatabaseConfig> &
    MakeLegacyOptions<LoggingConfig> &
    MakeLegacyOptions<MinerConfig> &
    MakeLegacyOptions<WalletConfig>
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
  wallet: WalletOptions
};

export const EthereumOptionsConfig = new OptionsConfig(ethereumDefaults);
