import BN from "bn.js";
import { SerializableLiteral } from "./serializable-literal";

interface BalanceConfig {
  type: bigint;
}

// The smallest denomination of FIL is an attoFIL (10^-18 FIL)
class Balance extends SerializableLiteral<BalanceConfig> {
  get config() {
    return {
      defaultValue: literal => {
        return literal || 500n * 1000000000000000000n;
      }
    };
  }

  sub(val: string | number | bigint): Balance {
    return new Balance(this.value - BigInt(val));
  }

  toFIL(): number {
    return new BN(this.value.toString(10))
      .div(new BN(10).pow(new BN(18)))
      .toNumber();
  }
}

export default Balance;
