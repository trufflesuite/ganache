import { normalize } from "./helpers";
import seedrandom from "seedrandom";

import { Definitions } from "@ganache/options";

const { alea } = seedrandom;

const randomAlphaNumericString = (() => {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const alphabetLength = alphabet.length;
  return (length: number, rng: () => number) => {
    let text = "";
    for (let i = 0; i < length; i++) {
      text += alphabet[(rng() * alphabetLength) | 0];
    }
    return text;
  };
})();

export type OptionsAccount = {
  balance: string | number | bigint | Buffer;
  secretKey?: string;
};

export type WalletConfig = {
  options: {
    /**
     * Number of accounts to generate at startup.
     *
     * @default 10
     */
    totalAccounts: {
      type: number;
      hasDefault: true;
    };

    /**
     * Seed to use to generate a mnemonic.
     */
    seed: {
      type: string;
      hasDefault: true;
    };

    /**
     * The default account balance, specified in tezos.
     *
     * @default 100 // tezos
     */
    defaultBalance: {
      type: number;
      hasDefault: true;
    };
  };
  exclusiveGroups: [["totalAccounts"], ["seed"]];
};

export const WalletOptions: Definitions<WalletConfig> = {
  totalAccounts: {
    normalize,
    cliDescription: "Number of accounts to generate at startup.",
    default: () => 10,
    cliAliases: ["a", "accounts"],
    cliType: "number"
  },
  seed: {
    normalize,
    cliDescription: "Seed to use to generate a mnemonic.",
    // The order of the options matter here! `wallet.deterministic`
    // needs to be prior to `wallet.seed` for `config.deterministic`
    // below to be set correctly
    default: () => randomAlphaNumericString(10, alea()),
    defaultDescription:
      "Random value, unless wallet.deterministic is specified",
    cliAliases: ["s", "seed"],
    cliType: "string"
  },
  defaultBalance: {
    normalize,
    cliDescription: "The default account balance, specified in tezos.",
    default: () => 100,
    cliAliases: ["e", "defaultBalanceTezos"],
    cliType: "number"
  }
};
