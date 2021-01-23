import { SerializableLiteral } from "./serializable-literal";
interface BalanceConfig {
  type: string;
}
declare class Balance extends SerializableLiteral<BalanceConfig> {
  get config(): {
    defaultValue: (literal: any) => any;
  };
  sub(val: string | number): Balance;
  toFIL(): number;
}
export default Balance;
