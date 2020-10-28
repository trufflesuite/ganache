import { Quantity, utils } from "@ganache/utils";
import { Definitions } from "@ganache/options";
import Address from "../things/address";

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
     * Defaults to `0` ("instamine mode").
     */
    blockTime: {
      type: number;
      hasDefault: true;
    };

    /**
     * Sets the default gas price in WEI for transactions if not otherwise specified.
     *
     * Defaults to `2_000_000`.
     */
    gasPrice: {
      type: Quantity;
      rawType: string | number | bigint;
      hasDefault: true;
    };

    /**
     * Sets the block gas limit in WEI.
     *
     * Defaults to `12_000_000`.
     */
    blockGasLimit: {
      type: Quantity;
      rawType: string | number | bigint;
      hasDefault: true;
      legacyName: "gasLimit";
    };

    /**
     * Sets the _default_ transaction gas limit in WEI.
     *
     * Defaults to `9_000`.
     */
    defaultTransactionGasLimit: {
      type: Quantity;
      rawType: string | number | bigint;
      hasDefault: true;
    };

    /**
     * Sets the transaction gas limit in WEI for `eth_call` and
     * eth_estimateGas` calls.
     *
     * Defaults to `9_007_199_254_740_991` (`2**53 - 1`).
     */
    callGasLimit: {
      type: Quantity;
      rawType: string | number | bigint;
      hasDefault: true;
    };

    /**
     * Enables legacy instamine mode, where transactions are fully mined before
     * the transaction's hash is returned to the caller. If `legacyInstamine` is
     * `true`, `blockTime` must be `0` (default).
     *
     * Defaults to `false`.
     */
    legacyInstamine: {
      type: boolean;
      hasDefault: true;
    };

    /**
     * Sets the address where mining rewards will go.
     *
     * * `{string}` hex-encoded address
     * * `{number}` index of the account returned by `eth_getAccounts`
     *
     * Defaults to `0x0000000000000000000000000000000000000000`.
     */
    coinbase: {
      rawType: string | number;
      type: string | number | Address;
      hasDefault: true;
    };
  };
  exclusiveGroups: [];
};

export const MinerOptions: Definitions<MinerConfig> = {
  blockTime: {
    normalize: rawInput => rawInput,
    default: () => 0
  },
  gasPrice: {
    normalize: Quantity.from,
    default: () => Quantity.from(2_000_000_000)
  },
  blockGasLimit: {
    normalize: Quantity.from,
    default: () => Quantity.from(12_000_000),
    legacyName: "gasLimit"
  },
  defaultTransactionGasLimit: {
    normalize: Quantity.from,
    default: () => Quantity.from(90000)
  },
  callGasLimit: {
    normalize: Quantity.from,
    default: () => Quantity.from(Number.MAX_SAFE_INTEGER)
  },
  coinbase: {
    normalize: rawInput => rawInput,
    default: () => Address.from(utils.ACCOUNT_ZERO)
  },
  legacyInstamine: {
    normalize: rawInput => rawInput,
    default: () => false
  }
};
