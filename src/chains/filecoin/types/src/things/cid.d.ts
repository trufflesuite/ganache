import { SerializableLiteral } from "./serializable-literal";
interface CIDConfig {
  type: string;
}
declare class CID extends SerializableLiteral<CIDConfig> {
  get config(): {};
  static isValid(value: string): boolean;
  static nullCID(): CID;
}
declare type SerializedCID = string;
export { CID, SerializedCID };
