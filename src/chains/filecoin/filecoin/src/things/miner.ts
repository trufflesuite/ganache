import { SerializableLiteral } from "./serializable-literal";

interface MinerConfig {
  type: string;
}

class Miner extends SerializableLiteral<MinerConfig> {
  get config() {
    return {
      defaultValue: literal => {
        return literal || "t01000";
      }
    };
  }
}

type SerializedMiner = string;

export { Miner, SerializedMiner };
