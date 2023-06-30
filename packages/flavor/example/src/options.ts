import {
  Defaults,
  Definitions,
  ExternalConfig,
  InternalConfig,
  OptionsConfig
} from "@ganache/options";

export type WalletDefinition = {
  options: {
    accounts: {
      type: string[];
      cliType: string[];
      hasDefault: true;
    };
    defaultBalance: {
      type: bigint;
      rawType: string;
      hasDefault: true;
    };
  };
};

function onlyUnique(value: string, index: number, array: string[]) {
  return array.indexOf(value) === index;
}

export const WalletOptions: Definitions<WalletDefinition> = {
  accounts: {
    normalize: userInput =>
      userInput
        .map(i => i.trim()) // trim whitespace
        .filter(i => i !== "") // trim empty strings
        .filter(onlyUnique), // remove duplicates
    cliDescription: "The accounts to use when creating the blockchain",
    cliType: "array:string",
    cliAliases: ["a", "accounts"],
    default: () => ["me", "you"]
  },
  defaultBalance: {
    normalize: userInput => {
      return BigInt(userInput);
    },
    cliDescription:
      "The default balance to use when initializing given accounts",
    cliAliases: ["b", "defaultBalance"],
    default: () => {
      return 100n;
    }
  }
};

export type NotABlockchainChainDefinition = {
  wallet: WalletDefinition;
};

export type NotABlockchainChainDefaults =
  Defaults<NotABlockchainChainDefinition>;
export const NotABlockchainChainDefaults: NotABlockchainChainDefaults = {
  wallet: WalletOptions
};

export type NotABlockchainChainProviderOptionsConfig =
  OptionsConfig<NotABlockchainChainDefinition>;
export const NotABlockchainChainProviderOptionsConfig: NotABlockchainChainProviderOptionsConfig =
  new OptionsConfig(NotABlockchainChainDefaults);

export type NotABlockchainChainProviderOptions = Partial<{
  [K in keyof NotABlockchainChainDefinition]: ExternalConfig<
    NotABlockchainChainDefinition[K]
  >;
}>;

export type NotABlockchainChainInternalOptions = {
  [K in keyof NotABlockchainChainDefinition]: InternalConfig<
    NotABlockchainChainDefinition[K]
  >;
};
