import { SerializableLiteral } from "./serializableliteral";

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
}

export default Balance;