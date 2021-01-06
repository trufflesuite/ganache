import { normalize } from "./helpers";
import seedrandom from "seedrandom";
import { entropyToMnemonic } from "bip39";

import { Definitions } from "@ganache/options";

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
      legacy: {
        /**
         * @deprecated Use wallet.accounts instead
         */
        accounts: number;
      };
    };

    /**
     * Seed to use to generate a mnemonic
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
     * Lock available accounts by default (good for third party transaction signing). Defaults to `false`.
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
     * The default account balance, specified in ether. Defaults to `100` ether
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
    default: () => 10,
    legacyName: "total_accounts"
  },
  accounts: {
    normalize,
    legacyName: "accounts"
  },
  seed: {
    normalize,
    default: () => randomAlphaNumericString(10, alea()),
    legacyName: "seed"
  },
  mnemonic: {
    normalize,
    default: config =>
      entropyToMnemonic(randomBytes(16, seedrandom(config.seed))),
    legacyName: "mnemonic"
  },
  unlockedAccounts: {
    normalize,
    legacyName: "unlocked_accounts"
  },
  secure: {
    normalize,
    default: () => false,
    legacyName: "secure"
  },
  accountKeysPath: {
    normalize,
    legacyName: "account_keys_path"
  },
  defaultBalance: {
    normalize,
    default: () => 100,
    legacyName: "default_balance_ether"
  },
  hdPath: {
    normalize,
    default: () => "m/44'/60'/0'/0/",
    legacyName: "hd_path"
  }
};
