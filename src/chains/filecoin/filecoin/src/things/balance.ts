import { LiteralDefinition, SerializableLiteral } from "./serializable-literal";
import BN from "bn.js";

interface BalanceConfig {
  type: bigint;
}

// The smallest denomination of FIL is an attoFIL (10^-18 FIL)
class Balance extends SerializableLiteral<BalanceConfig> {
  get config(): LiteralDefinition<BalanceConfig> {
    return {
      defaultValue: literal =>
        literal ? BigInt(literal) : 500n * 1000000000000000000n
    };
  }

  sub(val: string | number | bigint): Balance {
    const newBalance = this.value - BigInt(val);
    return new Balance(newBalance.toString(10));
  }

  toFIL(): number {
    return new BN(this.value.toString(10))
      .div(new BN(10).pow(new BN(18)))
      .toNumber();
  }
}

export default Balance;
