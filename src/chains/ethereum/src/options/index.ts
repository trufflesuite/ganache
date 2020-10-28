import { ChainConfig, ChainOptions } from "./chain-options";
import { DatabaseConfig, DatabaseOptions } from "./database-options";
import { LoggingConfig, LoggingOptions } from "./logging-options";
import { MinerConfig, MinerOptions } from "./miner-options";
import { WalletConfig, WalletOptions } from "./wallet-options";
import { Defaults, Definitions, ExternalConfig, InternalConfig, OptionsConfig } from "@ganache/options";

export type EthereumOptions = {
  chain: ChainConfig;
  database: DatabaseConfig;
  logging: LoggingConfig;
  miner: MinerConfig;
  wallet: WalletConfig;
};

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
