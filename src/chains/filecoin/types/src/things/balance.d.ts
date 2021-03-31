import { LiteralDefinition, SerializableLiteral } from "./serializable-literal";
interface BalanceConfig {
  type: bigint;
}
declare class Balance extends SerializableLiteral<BalanceConfig> {
  get config(): LiteralDefinition<BalanceConfig>;
  sub(val: string | number | bigint): void;
  add(val: string | number | bigint): void;
  toFIL(): number;
  static FILToLowestDenomination(fil: number): bigint;
  static LowestDenominationToFIL(attoFil: bigint): number;
}
declare type SerializedBalance = string;
export { Balance, SerializedBalance };
