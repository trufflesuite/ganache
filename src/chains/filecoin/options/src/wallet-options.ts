import { normalize } from "./helpers";
import Seedrandom from "seedrandom";

import { Definitions, DeterministicSeedPhrase } from "@ganache/options";

const unseededRng = Seedrandom();

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
     * @defaultValue 10
     */
    totalAccounts: {
      type: number;
      hasDefault: true;
    };

    /**
     * Use pre-defined, deterministic seed.
     */
    deterministic: {
      type: boolean;
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
     * The default account balance, specified in FIL.
     *
     * @defaultValue 100 // FIL
     */
    defaultBalance: {
      type: number;
      hasDefault: true;
    };
  };
  exclusiveGroups: [["deterministic", "seed"]];
};

export const WalletOptions: Definitions<WalletConfig> = {
  totalAccounts: {
    normalize,
    cliDescription: "Number of accounts to generate at startup.",
    default: () => 10,
    cliAliases: ["a"],
    cliType: "number"
  },
  deterministic: {
    normalize,
    cliDescription: "Use pre-defined, deterministic seed.",
    default: () => false,
    cliAliases: ["d"],
    cliType: "boolean",
    conflicts: ["seed"]
  },
  seed: {
    normalize,
    cliDescription: "Seed to use to generate a mnemonic.",
    // The order of the options matter here! `wallet.deterministic`
    // needs to be prior to `wallet.seed` for `config.deterministic`
    // below to be set correctly
    default: config =>
      config.deterministic === true
        ? DeterministicSeedPhrase
        : randomAlphaNumericString(10, unseededRng),
    cliAliases: ["s"],
    cliType: "string",
    conflicts: ["deterministic"]
  },
  defaultBalance: {
    normalize,
    cliDescription: "The default account balance, specified in FIL.",
    default: () => 100,
    cliAliases: ["b"],
    cliType: "number"
  }
};
