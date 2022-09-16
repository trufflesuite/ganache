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
    default: () => []
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

export type MyChainDefinition = {
  wallet: WalletDefinition;
};

export type MyChainDefaults = Defaults<MyChainDefinition>;
export const MyChainDefaults: MyChainDefaults = {
  wallet: WalletOptions
};

export type MyChainOptionsConfig = OptionsConfig<MyChainDefinition>;
export const MyChainOptionsConfig: MyChainOptionsConfig = new OptionsConfig(
  MyChainDefaults
);

export type MyChainProviderOptions = Partial<{
  [K in keyof MyChainDefinition]: ExternalConfig<MyChainDefinition[K]>;
}>;

export type MyChainInternalOptions = {
  [K in keyof MyChainDefinition]: InternalConfig<MyChainDefinition[K]>;
};
