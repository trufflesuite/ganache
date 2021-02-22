import { WalletConfig, WalletOptions } from "./wallet-options";
import {
  Defaults,
  Definitions,
  ExternalConfig,
  InternalConfig,
  OptionsConfig
} from "@ganache/options";

export type TezosOptions = {
  wallet: WalletConfig;
};

export type TezosProviderOptions = Partial<
  {
    [K in keyof TezosOptions]: ExternalConfig<TezosOptions[K]>;
  }
>;

export type TezosInternalOptions = {
  [K in keyof TezosOptions]: InternalConfig<TezosOptions[K]>;
};

export type TezosDefaults = {
  [K in keyof TezosOptions]: Definitions<TezosOptions[K]>;
};

export const TezosDefaults: Defaults<TezosOptions> = {
  wallet: WalletOptions
};

export const tezosDefaults: Defaults<TezosOptions> = {
  wallet: WalletOptions
};

export const TezosOptionsConfig = new OptionsConfig(TezosDefaults);

export * from "./wallet-options";
