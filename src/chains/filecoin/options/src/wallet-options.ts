import { normalize } from "./helpers";
import seedrandom from "seedrandom";

import { Definitions, DeterministicSeedPhrase } from "@ganache/options";

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
     * Seed to use to generate a mnemonic.
     */
    seed: {
      type: string;
      hasDefault: true;
    };

    /**
     * Use pre-defined, deterministic seed.
     */
    deterministic: {
      type: boolean;
      hasDefault: true;
    };
  };
};

export const WalletOptions: Definitions<WalletConfig> = {
  seed: {
    normalize,
    shortDescription: "Seed to use to generate a mnemonic.",
    default: config =>
      config.deterministic
        ? DeterministicSeedPhrase
        : randomAlphaNumericString(10, alea()),
    cliType: "string"
  },
  deterministic: {
    normalize,
    shortDescription: "Use pre-defined, deterministic seed.",
    default: () => false,
    cliAliases: ["d"],
    cliType: "boolean"
  }
};
