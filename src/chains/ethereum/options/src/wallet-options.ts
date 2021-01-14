import { normalize } from "./helpers";
import seedrandom from "seedrandom";
import { entropyToMnemonic } from "bip39";

import { Definitions, DeterministicSeedPhrase } from "@ganache/options";

const { alea } = seedrandom;

function randomBytes(length: number, rng: () => number) {
  const buf = Buffer.allocUnsafe(length);
  for (let i = 0; i < length; i++) {
    buf[i] = (rng() * 255) | 0;
  }
  return buf;
}

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
      legacy: {
        /**
         * @deprecated Use wallet.totalAccounts instead
         */
        total_accounts: number;
      };
    };

    /**
     * Array of Accounts. Each object should have a balance key with a hexadecimal
     * value. The key secretKey can also be specified, which represents the
     * account's private key. If no secretKey, the address is auto-generated with
     * the given balance. If specified, the key is used to determine the account's
     * address.
     */
    accounts: {
      type: OptionsAccount[];
      rawType: OptionsAccount[] | string[];
      legacy: {
        /**
         * @deprecated Use wallet.accounts instead
         */
        accounts: number;
      };
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
      legacy: {
        /**
         * @deprecated Use wallet.seed instead
         */
        seed: number;
      };
    };

    /**
     * Use a specific HD wallet mnemonic to generate initial addresses.
     */
    mnemonic: {
      type: string;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use wallet.mnemonic instead
         */
        mnemonic: number;
      };
    };

    /**
     * Array of addresses or address indexes specifying which accounts should be unlocked.
     */
    unlockedAccounts: {
      type: Array<string | number>;
      legacy: {
        /**
         * @deprecated Use wallet.unlockedAccounts instead
         */
        unlocked_accounts: Array<string | number>;
      };
    };

    /**
     * Lock available accounts by default (good for third party transaction signing).
     *
     * @default false
     */
    secure: {
      type: boolean;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use wallet.secure instead
         */
        secure: number;
      };
    };

    /**
     * Specifies a file to save accounts and private keys to, for testing.
     *
     * Can be a filename or file descriptor.
     *
     * If specifying a filename, the directory path must already exist.
     *
     * See: https://nodejs.org/api/fs.html#fs_fs_writefilesync_file_data_options
     */
    accountKeysPath: {
      type: string | number;
      legacy: {
        /**
         * @deprecated Use wallet.accountKeysPath instead
         */
        account_keys_path: string | number;
      };
    };

    /**
     * The default account balance, specified in ether.
     *
     * @default 100 // ether
     */
    defaultBalance: {
      type: number;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use wallet.defaultBalance instead
         */
        default_balance_ether: number;
      };
    };

    /**
     * The hierarchical deterministic path to use when generating accounts.
     *
     * @default "m/44'/60'/0'/0/"
     */
    hdPath: {
      type: string;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use wallet.totalAcchdPathounts instead
         */
        hd_path: string;
      };
    };
  };
  exclusiveGroups: [["totalAccounts", "accounts"], ["mnemonic", "seed"]];
};

export const WalletOptions: Definitions<WalletConfig> = {
  totalAccounts: {
    normalize,
    shortDescription: "Number of accounts to generate at startup.",
    default: () => 10,
    legacyName: "total_accounts",
    cliAliases: ["a", "accounts"],
    cliType: "number"
  },
  accounts: {
    normalize: rawInput => {
      if (rawInput.length > 0) {
        if (typeof rawInput[0] === "string") {
          return (rawInput as string[]).map(accountString => {
            const accountParts = accountString.split(",");
            return {
              secretKey: accountParts[0],
              balance: accountParts[1]
            } as OptionsAccount;
          });
        } else {
          return rawInput as OptionsAccount[];
        }
      } else {
        return [];
      }
    },
    shortDescription:
      "Array of Accounts. Each object should have a balance key with a hexadecimal value.",
    legacyName: "accounts",
    cliAliases: ["account"],
    cliType: "array"
  },
  deterministic: {
    normalize,
    shortDescription: "Use pre-defined, deterministic seed.",
    default: () => false,
    cliAliases: ["d", "deterministic"],
    cliType: "boolean"
  },
  seed: {
    normalize,
    shortDescription: "Seed to use to generate a mnemonic.",
    // The order of the options matter here! `wallet.deterministic`
    // needs to be prior to `wallet.seed` for `config.deterministic`
    // below to be set correctly
    default: config =>
      config.deterministic
        ? DeterministicSeedPhrase
        : randomAlphaNumericString(10, alea()),
    defaultDescription:
      "Random value, unless wallet.deterministic is specified",
    legacyName: "seed",
    cliAliases: ["s", "seed"],
    cliType: "string"
  },
  mnemonic: {
    normalize,
    shortDescription:
      "Use a specific HD wallet mnemonic to generate initial addresses.",
    // The order of the options matter here! `wallet.seed`
    // needs to be prior to `wallet.mnemonic` for `config.seed`
    // below to be set correctly
    default: config =>
      entropyToMnemonic(randomBytes(16, seedrandom(config.seed))),
    defaultDescription: "Generated from wallet.seed",
    legacyName: "mnemonic",
    cliAliases: ["m", "mnemonic"],
    cliType: "string"
  },
  unlockedAccounts: {
    normalize,
    shortDescription:
      "Array of addresses or address indexes specifying which accounts should be unlocked.",
    legacyName: "unlocked_accounts",
    cliAliases: ["u", "unlock"],
    cliType: "array"
  },
  secure: {
    normalize,
    shortDescription:
      "Lock available accounts by default (good for third party transaction signing).",
    default: () => false,
    legacyName: "secure",
    cliAliases: ["n", "secure"],
    cliType: "boolean"
  },
  accountKeysPath: {
    normalize,
    shortDescription:
      "Specifies a file to save accounts and private keys to, for testing.",
    legacyName: "account_keys_path",
    cliAliases: ["account_keys_path", "acctKeys"],
    cliType: "string"
  },
  defaultBalance: {
    normalize,
    shortDescription: "The default account balance, specified in ether.",
    default: () => 100,
    legacyName: "default_balance_ether",
    cliAliases: ["e", "defaultBalanceEther"],
    cliType: "number"
  },
  hdPath: {
    normalize,
    shortDescription:
      "The hierarchical deterministic path to use when generating accounts.",
    default: () => "m/44'/60'/0'/0/",
    legacyName: "hd_path",
    cliType: "string"
  }
};
