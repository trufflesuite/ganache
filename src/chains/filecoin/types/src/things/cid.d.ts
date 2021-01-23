import { SerializableLiteral } from "./serializable-literal";
interface CIDConfig {
  type: string;
}
declare class CID extends SerializableLiteral<CIDConfig> {
  get config(): {
    required: boolean;
  };
  static isValid(value: string): boolean;
}
declare type SerializedCID = string;
export { CID, SerializedCID };
