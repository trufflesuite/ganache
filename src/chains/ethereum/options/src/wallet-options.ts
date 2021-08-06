import { normalize } from "./helpers";
import seedrandom from "seedrandom";
import { entropyToMnemonic } from "bip39";
import { Definitions, DeterministicSeedPhrase } from "@ganache/options";

const unseededRng = seedrandom();

/**
 * WARNING: to maintain compatibility with ganache v2 this RNG only generates
 * numbers from 0-254 instead of 0-255! Hence the name, `notVeryRandomBytes`
 * @param length
 * @param rng
 */
function notVeryRandomBytes(length: number, rng: () => number) {
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
     * @defaultValue 10
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
      legacy: {
        /**
         * @deprecated Use wallet.accounts instead
         */
        accounts: OptionsAccount[];
      };
      cliType: string[];
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
        seed: string;
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
        mnemonic: string;
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
      // the provider _does_ accept a string|number, but yargs is overzealous in
      //  its auto-coercion and will treat hex addresses as numbers, causing issues.
      cliType: string[];
    };

    /**
     * Lock available accounts by default (good for third party transaction signing).
     *
     * @defaultValue false
     */
    secure: {
      type: boolean;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use wallet.secure instead
         */
        secure: boolean;
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
     * @defaultValue 1000 // ether
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
     * @defaultValue "m/44'/60'/0'/0/"
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
  exclusiveGroups: [
    ["accounts", "totalAccounts"],
    ["deterministic", "mnemonic", "seed"]
  ];
};

export const WalletOptions: Definitions<WalletConfig> = {
  accounts: {
    normalize,
    cliDescription: `Account data in the form \`<private_key>,<initial_balance>\`, can be specified multiple times. Note that private keys are 64 characters long and must be entered as an 0x-prefixed hex string. Balance can either be input as an integer, or as a 0x-prefixed hex string with either form specifying the initial balance in wei.`,
    legacyName: "accounts",
    cliAliases: ["account"],
    cliType: "array:string",
    cliCoerce: rawInput => {
      return rawInput.map(accountString => {
        // split *1* time on the first comma
        const [secretKey, balance] = accountString.split(/,(.+)/);
        return {
          secretKey,
          balance: BigInt(balance)
        } as OptionsAccount;
      });
    },
    conflicts: ["totalAccounts"]
  },
  totalAccounts: {
    normalize,
    cliDescription: "Number of accounts to generate at startup.",
    default: config => (config.accounts == null ? 10 : 0),
    legacyName: "total_accounts",
    cliAliases: ["a", "accounts"],
    cliType: "number",
    conflicts: ["accounts"]
  },
  deterministic: {
    normalize,
    cliDescription: "Use pre-defined, deterministic seed.",
    default: () => false,
    cliAliases: ["d", "deterministic"],
    cliType: "boolean",
    conflicts: ["mnemonic", "seed"]
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
    defaultDescription:
      "Random value, unless wallet.deterministic is specified",
    legacyName: "seed",
    cliAliases: ["s", "seed"],
    cliType: "string",
    conflicts: ["mnemonic", "deterministic"]
  },
  mnemonic: {
    normalize,
    cliDescription:
      "Use a specific HD wallet mnemonic to generate initial addresses.",
    // The order of the options matter here! `wallet.seed`
    // needs to be prior to `wallet.mnemonic` for `config.seed`
    // below to be set correctly
    default: config =>
      entropyToMnemonic(notVeryRandomBytes(16, seedrandom(config.seed))),
    defaultDescription: "Generated from wallet.seed",
    legacyName: "mnemonic",
    cliAliases: ["m", "mnemonic"],
    cliType: "string",
    conflicts: ["seed", "deterministic"]
  },
  unlockedAccounts: {
    normalize,
    cliDescription:
      "Array of addresses or address indexes specifying which accounts should be unlocked.",
    legacyName: "unlocked_accounts",
    cliAliases: ["u", "unlock"],
    cliType: "array:string"
  },
  secure: {
    normalize,
    cliDescription:
      "Lock available accounts by default (good for third party transaction signing).",
    default: () => false,
    legacyName: "secure",
    cliAliases: ["n", "secure"],
    cliType: "boolean"
  },
  accountKeysPath: {
    normalize,
    cliDescription:
      "Specifies a file to save accounts and private keys to, for testing.",
    legacyName: "account_keys_path",
    cliAliases: ["account_keys_path", "acctKeys"],
    cliType: "string"
  },
  defaultBalance: {
    normalize,
    cliDescription: "The default account balance, specified in ether.",
    default: () => 1000,
    legacyName: "default_balance_ether",
    cliAliases: ["e", "defaultBalanceEther"],
    cliType: "number"
  },
  hdPath: {
    normalize,
    cliDescription:
      "The hierarchical deterministic path to use when generating accounts.",
    default: () => "m/44'/60'/0'/0/",
    legacyName: "hd_path",
    cliType: "string"
  }
};
