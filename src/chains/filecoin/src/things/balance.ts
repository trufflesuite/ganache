import { SerializableLiteral } from "./serializableliteral";
import BN from "bn.js";

interface BalanceConfig {
  type: string;
}

class Balance extends SerializableLiteral<BalanceConfig>  {
  get config() {
    return {
      defaultValue: (literal) => {
        return literal || "500000000000000000000000";
      }
    }
  };

  sub(val:string | number):Balance {
    return new Balance(new BN(this.value).sub(new BN(val)).toString(10));
  }
}

export default Balance;