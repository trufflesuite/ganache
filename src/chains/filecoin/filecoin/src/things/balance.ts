import { SerializableLiteral } from "./serializable-literal";
import BN from "bn.js";

interface BalanceConfig {
  type: string;
}

class Balance extends SerializableLiteral<BalanceConfig> {
  get config() {
    return {
      defaultValue: literal => {
        return literal || "500000000000000000000000";
      }
    };
  }

  sub(val: string | number): Balance {
    return new Balance(new BN(this.value).sub(new BN(val)).toString(10));
  }

  toFIL(): number {
    return new BN(this.value).div(new BN(10).pow(new BN(21))).toNumber();
  }
}

export default Balance;
