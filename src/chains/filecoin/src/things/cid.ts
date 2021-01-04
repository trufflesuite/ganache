import { SerializableLiteral } from "./serializable-literal";

interface CIDConfig {
  type: string;
}

class CID extends SerializableLiteral<CIDConfig> {
  get config() {
    return {
      required: true
    };
  }

  // Note: This does not (yet) check for cryptographic validity!
  static isValid(value: string): boolean {
    return value.length >= 59 && value.indexOf("ba") == 0;
  }
}

type SerializedCID = string;

export { CID, SerializedCID };
