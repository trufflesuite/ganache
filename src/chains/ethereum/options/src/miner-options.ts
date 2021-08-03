import { normalize } from "./helpers";
import {
  Data,
  Quantity,
  ACCOUNT_ZERO,
  BUFFER_EMPTY,
  RPCQUANTITY_EMPTY,
  RPCQUANTITY_ONE
} from "@ganache/utils";
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
     * Sets the default gas price in WEI for transactions if not otherwise specified.
     *
     * @defaultValue 2_000_000
     */
    gasPrice: {
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
     * Sets the block difficulty
     *
     * @defaultValue 1
     */
    difficulty: {
      type: Quantity;
      rawType: number;
      hasDefault: true;
    };

    /**
     * Sets the block gas limit in WEI.
     *
     * @defaultValue 12_000_000
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
     * eth_estimateGas` calls.
     *
     * @defaultValue 9_007_199_254_740_991 // 2**53 - 1
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
     * Enables legacy instamine mode, where transactions are fully mined before
     * the transaction's hash is returned to the caller. If `legacyInstamine` is
     * `true`, `blockTime` must be `0` (default).
     *
     * @defaultValue false
     * @deprecated Will be removed in v4
     */
    legacyInstamine: {
      type: boolean;
      hasDefault: true;
      // legacyInstamine is _not_ a legacy option, but it is used as one so users
      // can use it just as they would other legacy options (without a namespace)
      legacy: {
        /**
         * @deprecated Use miner.legacyInstamine instead. Will be removed in v4.
         */
        legacyInstamine: boolean;
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
  };
};

/**
 * Attempts to convert strings that don't start with `0x` to a BigInt
 *
 * @param str a string that represents a bigint, number, or hex number
 */
const toBigIntOrString = (str: string) => {
  if (str.startsWith("0x")) {
    return str;
  } else {
    return BigInt(str);
  }
};

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
  gasPrice: {
    normalize: Quantity.from,
    cliDescription:
      "Sets the default gas price in WEI for transactions if not otherwise specified.",
    default: () => Quantity.from(2_000_000_000),
    legacyName: "gasPrice",
    cliAliases: ["g", "gasPrice"],
    cliType: "string",
    cliCoerce: toBigIntOrString
  },
  blockGasLimit: {
    normalize: Quantity.from,
    cliDescription: "Sets the block gas limit in WEI.",
    default: () => Quantity.from(12_000_000),
    legacyName: "gasLimit",
    cliAliases: ["l", "gasLimit"],
    cliType: "string",
    cliCoerce: toBigIntOrString
  },
  defaultTransactionGasLimit: {
    normalize: rawType =>
      rawType === "estimate" ? RPCQUANTITY_EMPTY : Quantity.from(rawType),
    cliDescription:
      'Sets the default transaction gas limit in WEI. Set to "estimate" to use an estimate (slows down transaction execution by 40%+).',
    default: () => Quantity.from(90_000),
    cliType: "string",
    cliCoerce: toBigIntOrString
  },
  difficulty: {
    normalize: Quantity.from,
    cliDescription: "Sets the block difficulty.",
    default: () => RPCQUANTITY_ONE,
    cliType: "number"
  },
  callGasLimit: {
    normalize: Quantity.from,
    cliDescription:
      "Sets the transaction gas limit in WEI for `eth_call` and `eth_estimateGas` calls.",
    default: () => Quantity.from(Number.MAX_SAFE_INTEGER),
    legacyName: "callGasLimit",
    cliType: "string",
    cliCoerce: toBigIntOrString
  },
  legacyInstamine: {
    normalize,
    cliDescription:
      "Enables legacy instamine mode, where transactions are fully mined before the transaction's hash is returned to the caller.",
    default: () => false,
    legacyName: "legacyInstamine",
    cliType: "boolean"
  },
  coinbase: {
    normalize: rawType => {
      return typeof rawType === "number" ? rawType : Address.from(rawType);
    },
    cliDescription: "Sets the address where mining rewards will go.",
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
    default: () => Data.from(BUFFER_EMPTY),
    cliType: "string"
  }
};
