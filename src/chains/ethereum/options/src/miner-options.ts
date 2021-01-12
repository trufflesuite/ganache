import { normalize } from "./helpers";
import { Data, Quantity, utils } from "@ganache/utils";
import { Address } from "@ganache/ethereum-utils";
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
     * @default 0 // "instamine mode"
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
     * @default 2_000_000
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
    };

    /**
     * Sets the block gas limit in WEI.
     *
     * @default 12_000_000
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
    };

    /**
     * Sets the _default_ transaction gas limit in WEI. Set to `"estimate"` to
     * use an estimate (slows down transaction execution by 40%+).
     *
     * @default 90_000
     */
    defaultTransactionGasLimit: {
      type: Quantity;
      rawType: "estimate" | string | number | bigint;
      hasDefault: true;
    };

    /**
     * Sets the transaction gas limit in WEI for `eth_call` and
     * eth_estimateGas` calls.
     *
     * @default 9_007_199_254_740_991 // 2**53 - 1
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
    };

    /**
     * Enables legacy instamine mode, where transactions are fully mined before
     * the transaction's hash is returned to the caller. If `legacyInstamine` is
     * `true`, `blockTime` must be `0` (default).
     *
     * @default false
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
     * @default "0x0000000000000000000000000000000000000000"
     */
    coinbase: {
      rawType: string | number;
      type: Address | number;
      hasDefault: true;
    };

    /**
     * Set the extraData block header field a miner can include.
     *
     * @default ""
     */
    extraData: {
      rawType: string;
      type: Data;
      hasDefault: true;
    };
  };
};

export const MinerOptions: Definitions<MinerConfig> = {
  blockTime: {
    normalize,
    shortDescription:
      'Sets the `blockTime` in seconds for automatic mining. blockTime of `0` enables "instamine mode", where new executable transactions will be mined instantly.',
    default: () => 0,
    legacyName: "blockTime",
    cliAliases: ["b", "blockTime"],
    cliType: "number"
  },
  gasPrice: {
    normalize: Quantity.from,
    shortDescription:
      "Sets the default gas price in WEI for transactions if not otherwise specified.",
    default: () => Quantity.from(2_000_000_000),
    legacyName: "gasPrice",
    cliAliases: ["g", "gasPrice"],
    cliType: "string"
  },
  blockGasLimit: {
    normalize: Quantity.from,
    shortDescription: "Sets the block gas limit in WEI.",
    default: () => Quantity.from(12_000_000),
    legacyName: "gasLimit",
    cliAliases: ["l", "gasLimit"],
    cliType: "string"
  },
  defaultTransactionGasLimit: {
    normalize: rawType =>
      rawType === "estimate" ? utils.RPCQUANTITY_EMPTY : Quantity.from(rawType),
    shortDescription:
      'Sets the _default_ transaction gas limit in WEI. Set to "estimate" to use an estimate (slows down transaction execution by 40%+).',
    default: () => Quantity.from(90_000),
    cliType: "string"
  },
  callGasLimit: {
    normalize: Quantity.from,
    shortDescription:
      "Sets the transaction gas limit in WEI for `eth_call` and `eth_estimateGas` calls.",
    default: () => Quantity.from(Number.MAX_SAFE_INTEGER),
    legacyName: "callGasLimit",
    cliType: "string"
  },
  legacyInstamine: {
    normalize,
    shortDescription:
      "Enables legacy instamine mode, where transactions are fully mined before the transaction's hash is returned to the caller.",
    default: () => false,
    legacyName: "legacyInstamine",
    cliType: "boolean"
  },
  coinbase: {
    normalize: rawType => {
      if (typeof rawType === "number") {
        return rawType;
      } else {
        if (/^0x/i.exec(rawType)) {
          return Address.from(rawType);
        } else {
          // try to convert the arg string to a number.
          // don't use parseInt because strings like `"123abc"` parse
          // to `123`, and there is probably an error on the user's side we'd
          // want to uncover.
          const index = ((rawType as any) as number) - 0;
          if (Number.isSafeInteger(index)) {
            return index;
          } else {
            throw new Error(
              `Invalid value for option miner.coinbase: ${rawType}`
            );
          }
        }
      }
    },
    shortDescription: "Sets the address where mining rewards will go.",
    default: () => Address.from(utils.ACCOUNT_ZERO),
    cliType: "string"
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
    shortDescription:
      "Set the extraData block header field a miner can include.",
    default: () => Data.from(utils.BUFFER_EMPTY),
    cliType: "string"
  }
};
