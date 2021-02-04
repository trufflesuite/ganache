import { LiteralDefinition, SerializableLiteral } from "./serializable-literal";
interface BalanceConfig {
  type: bigint;
}
declare class Balance extends SerializableLiteral<BalanceConfig> {
  get config(): LiteralDefinition<BalanceConfig>;
  sub(val: string | number | bigint): Balance;
  toFIL(): number;
}
export default Balance;
