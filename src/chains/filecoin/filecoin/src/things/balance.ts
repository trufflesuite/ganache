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
        literal ? BigInt(literal) : Balance.FILToLowestDenomination(100)
    };
  }

  sub(val: string | number | bigint): void {
    this.value -= BigInt(val);
  }

  add(val: string | number | bigint): void {
    this.value += BigInt(val);
  }

  toFIL(): number {
    return Balance.LowestDenominationToFIL(this.value);
  }

  static FILToLowestDenomination(fil: number): bigint {
    return BigInt(fil) * 1000000000000000000n;
  }

  static LowestDenominationToFIL(attoFil: bigint): number {
    return new BN(attoFil.toString(10))
      .div(new BN(10).pow(new BN(18)))
      .toNumber();
  }
}

type SerializedBalance = string;

export { Balance, SerializedBalance };
