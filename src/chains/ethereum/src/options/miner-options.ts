import { Quantity, utils } from "@ganache/utils";
import { Definitions, ExclusiveGroupUnionAndUnconstrainedPlus } from "./helpers";
import Address from "../things/address";

type MinerConfig = {
  options: {
    readonly blockTime: {
      type: number;
      hasDefault: true;
    }
    readonly gasPrice: {
      type: Quantity;
      rawType: string | number | bigint;
      hasDefault: true;
    }
    readonly blockGasLimit: {
      type: Quantity;
      rawType: string | number | bigint;
      hasDefault: true;
    }
    readonly transactionGasLimit: {
      type: Quantity;
      rawType: string | number | bigint;
      hasDefault: true;
    }
    readonly callGasLimit: {
      type: Quantity;
      rawType: string | number | bigint;
      hasDefault: true;
    }
    readonly legacyInstamine: {
      type: boolean;
      hasDefault: true;
    }
    readonly coinbase: {
      rawType: string;
      type: Address;
      hasDefault: true;
    }
  },
  exclusiveGroups: [
    ["blockTime", "legacyInstamine"]
  ]
}

export const MinerOptions: Definitions<MinerConfig> = {
  blockTime: {
    normalize(rawInput) {
      return rawInput;
    },
    default: () => 0
  },
  gasPrice: {
    normalize(rawInput) {
      return Quantity.from(rawInput);
    },
    default: () => Quantity.from(2_000_000_000)
  },
  blockGasLimit: {
    normalize(rawInput) {
      return Quantity.from(rawInput);
    },
    default: () => Quantity.from(12_000_000)
  },
  transactionGasLimit: {
    normalize(rawInput) {
      return Quantity.from(rawInput);
    },
    default: () => Quantity.from(90000)
  },
  callGasLimit: {
    normalize(rawInput) {
      return Quantity.from(rawInput);
    },
    default: () => Quantity.from(Number.MAX_SAFE_INTEGER),
  },
  coinbase: {
    normalize(rawInput) {
      return Address.from(rawInput);
    },
    default: () => Address.from(utils.ACCOUNT_ZERO)
  },
  legacyInstamine: {
    normalize(rawInput) {
      return rawInput;
    },
    default: () => false
  }
}

export type InternalMinerOptions = ExclusiveGroupUnionAndUnconstrainedPlus<MinerConfig>
