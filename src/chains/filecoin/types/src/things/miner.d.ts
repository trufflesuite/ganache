import { SerializableLiteral } from "./serializable-literal";
interface MinerConfig {
  type: string;
}
declare class Miner extends SerializableLiteral<MinerConfig> {
  get config(): {
    defaultValue: (literal: any) => any;
  };
}
declare type SerializedMiner = string;
export { Miner, SerializedMiner };
