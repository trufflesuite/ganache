import { normalize } from "./helpers";
import { Data, Quantity, ACCOUNT_ZERO } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import { Definitions } from "@ganache/options";

export type MinerConfig = {
  options: {
    /**
     * Sets the `blockTime` in seconds for automatic mining. A blockTime of `0`
     * (default) enables "instamine mode", where new executable transactions
     * will be mined instantly.
     *
     * Using the `blockTime` option is discouraged unless you have tests which
     * require a specific mining interval.
     *
     * @defaultValue 0 // "instamine mode"
     */
    blockTime: {
      type: number;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use miner.blockTime instead
         */
        blockTime: number;
      };
    };

    /**
     * The amount of time, in seconds, to add to the `timestamp` of each new
     * block header.
     *
     * By default the value is `"clock"`, which uses your system clock time as
     * the timestamp for each block.
     *
     * @defaultValue "clock"
     */
    timestampIncrement: {
      type: "clock" | Quantity;
      rawType: "clock" | string | number | bigint;
      hasDefault: true;
      cliType: string;
    };

    /**
     * Sets the default gas price in WEI for transactions if not otherwise specified.
     *
     * @defaultValue 2_000_000
     */
    defaultGasPrice: {
      type: Quantity;
      rawType: string | number | bigint;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use miner.gasPrice instead
         */
        gasPrice: string | number | bigint;
      };
      cliType: string;
    };

    /**
     * Sets the block difficulty; value is always 0 after the merge hardfork
     *
     * @defaultValue 1
     */
    difficulty: {
      type: Quantity;
      rawType: string | number | bigint;
      hasDefault: true;
      cliType: string;
    };

    /**
     * Sets the block gas limit in WEI.
     *
     * @defaultValue 30_000_000
     */
    blockGasLimit: {
      type: Quantity;
      rawType: string | number | bigint;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use miner.blockGasLimit instead
         */
        gasLimit: string | number | bigint;
      };
      cliType: string;
    };

    /**
     * Sets the default transaction gas limit in WEI. Set to `"estimate"` to
     * use an estimate (slows down transaction execution by 40%+).
     *
     * @defaultValue 90_000
     */
    defaultTransactionGasLimit: {
      type: Quantity;
      rawType: "estimate" | string | number | bigint;
      hasDefault: true;
      cliType: string;
    };

    /**
     * Sets the transaction gas limit in WEI for `eth_call` and
     * `eth_estimateGas` calls.
     *
     * @defaultValue 50_000_000
     */
    callGasLimit: {
      type: Quantity;
      rawType: string | number | bigint;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use miner.callGasLimit instead
         */
        callGasLimit: string | number | bigint;
      };
      cliType: string;
    };

    /**
     * Set the instamine mode to either "eager" (default) or "strict".
     *  * In "eager" mode a transaction will be included in a block before
     * its hash is returned to the caller.
     *  * In "strict" mode a transaction's hash is returned to the caller before
     * the transaction is included in a block.
     * `instamine` has no effect if `blockTime` is *not* `0` (the default).
     *
     * @defaultValue "eager"
     */
    instamine: {
      type: "eager" | "strict";
      hasDefault: true;
      // `instamine` is _not_ a legacy option, but it is used as one so users
      // can use it just as they would other legacy options, i.e., without a
      //  namespace
      legacy: {
        instamine: "eager" | "strict";
      };
    };

    /**
     * Sets the address where mining rewards will go.
     *
     * * `{string}` hex-encoded address
     * * `{number}` index of the account returned by `eth_getAccounts`
     *
     * @defaultValue "0x0000000000000000000000000000000000000000"
     */
    coinbase: {
      rawType: string | number;
      type: Address | number;
      hasDefault: true;
      cliType: string;
    };

    /**
     * Set the extraData block header field a miner can include.
     *
     * @defaultValue ""
     */
    extraData: {
      rawType: string;
      type: Data;
      hasDefault: true;
    };

    /**
     * Minimum price bump percentage needed to replace a transaction that already exists in the transaction pool.
     *
     * @defaultValue ""
     */
    priceBump: {
      type: bigint;
      rawType: string | number | bigint;
      hasDefault: true;
      cliType: string;
    };
  };
};

/**
 * Attempts to convert strings that don't start with `0x` to a BigInt
 *
 * @param str - a string that represents a bigint, number, or hexadecimal value
 */
const toBigIntOrString = (str: string) => {
  if (str.startsWith("0x")) {
    return str;
  } else {
    return BigInt(str);
  }
};
/**
 * Handles defaultTransactionGasLimit special case of 'estimate' for tx value.
 *
 * @param str - the string literal 'estimate' or string that that represents a bigint, number, or hexadecimal value.
 */
const estimateOrToBigIntOrString = (str: string) => {
  if (str === "estimate") {
    return str;
  } else {
    return toBigIntOrString(str);
  }
};

/**
 * Attempts to convert strings that don't start with `0x` to a number
 *
 * @param str - a string that represents a number, or hexadecimal value
 */
const toNumberOrString = (str: string) => {
  if (str.startsWith("0x")) {
    return str;
  } else {
    return parseInt(str);
  }
};

// The `normalize` property expects a function with a signature of
// `normalize(value, config)`, but `Quantity.from(value, nullable)` doesn't
// match, so we wrap the `from` method in a function that matches the signature.
// We only instantiate the wrapper function once to avoid unnecessary function
// allocations.
const normalizeQuantity = value => Quantity.from(value);

export const MinerOptions: Definitions<MinerConfig> = {
  blockTime: {
    normalize: rawInput => {
      if (rawInput < 0) {
        throw new Error("miner.blockTime must be 0 or a positive number.");
      }

      return rawInput;
    },
    cliDescription:
      'Sets the `blockTime` in seconds for automatic mining. A blockTime of `0` enables "instamine mode", where new executable transactions will be mined instantly.',
    default: () => 0,
    legacyName: "blockTime",
    cliAliases: ["b", "blockTime"],
    cliType: "number"
  },
  timestampIncrement: {
    normalize: rawType =>
      rawType === "clock" ? "clock" : Quantity.from(BigInt(rawType)),
    cliDescription:
      'The amount of time, in seconds, to add to the `timestamp` of each new block header. By default the value is `"clock"`, which uses your system clock time as the timestamp for each block.',
    default: () => "clock",
    cliType: "string"
  },
  defaultGasPrice: {
    normalize: normalizeQuantity,
    cliDescription:
      "Sets the default gas price in WEI for transactions if not otherwise specified.",
    default: () => Quantity.from(2_000_000_000),
    legacyName: "gasPrice",
    cliAliases: ["g", "gasPrice"],
    cliType: "string",
    cliCoerce: toBigIntOrString
  },
  blockGasLimit: {
    normalize: normalizeQuantity,
    cliDescription: "Sets the block gas limit in WEI.",
    default: () => Quantity.from(30_000_000),
    legacyName: "gasLimit",
    cliAliases: ["l", "gasLimit"],
    cliType: "string",
    cliCoerce: toBigIntOrString
  },
  defaultTransactionGasLimit: {
    normalize: rawType =>
      rawType === "estimate" ? Quantity.Empty : Quantity.from(rawType),
    cliDescription:
      'Sets the default transaction gas limit in WEI. Set to "estimate" to use an estimate (slows down transaction execution by 40%+).',
    default: () => Quantity.from(90_000),
    cliType: "string",
    cliCoerce: estimateOrToBigIntOrString
  },
  difficulty: {
    normalize: normalizeQuantity,
    cliDescription:
      "Sets the block difficulty. Value is always 0 after the merge hardfork.",
    default: () => Quantity.One,
    cliType: "string",
    cliCoerce: toBigIntOrString
  },
  callGasLimit: {
    normalize: normalizeQuantity,
    cliDescription:
      "Sets the transaction gas limit in WEI for `eth_call` and `eth_estimateGas` calls.",
    default: () => Quantity.from(50_000_000),
    legacyName: "callGasLimit",
    cliType: "string",
    cliCoerce: toBigIntOrString
  },
  instamine: {
    normalize,
    cliDescription: `Set the instamine mode to either "eager" (default) or "strict".
 * In "eager" mode a transaction will be included in a block before its hash is returned to the caller.
 * In "strict" mode a transaction's hash is returned to the caller before the transaction is included in a block.
\`instamine\` has no effect if \`blockTime\` is *not* \`0\` (the default).`,
    default: () => "eager",
    legacyName: "instamine",
    cliAliases: ["instamine"],
    cliType: "string",
    cliChoices: ["eager", "strict"]
  },
  coinbase: {
    normalize: rawType => {
      return typeof rawType === "number" ? rawType : Address.from(rawType);
    },
    cliDescription: "Sets the address where mining rewards will go.",
    cliType: "string",
    cliCoerce: toNumberOrString,
    default: () => Address.from(ACCOUNT_ZERO)
  },
  extraData: {
    normalize: (extra: string) => {
      const bytes = Data.from(extra);
      if (bytes.toBuffer().length > 32) {
        throw new Error(
          `extra exceeds max length. ${bytes.toBuffer().length} > 32`
        );
      }
      return bytes;
    },
    cliDescription: "Set the extraData block header field a miner can include.",
    default: () => Data.Empty,
    cliType: "string"
  },
  priceBump: {
    normalize: BigInt,
    cliDescription:
      "Minimum price bump percentage needed to replace a transaction that already exists in the transaction pool.",
    default: () => 10n,
    cliType: "string"
  }
};
