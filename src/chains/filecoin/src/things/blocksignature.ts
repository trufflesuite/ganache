import { SerializableObject } from "./serializableobject";
import { KnownKeys } from "@ganache/utils/src/types";

interface BlockSignatureParameters {
  type: number;
  data: string;
}

interface SerializedBlockSignatureParameters {
  Type: number;
  Data: string; 
}

class BlockSignature extends SerializableObject<BlockSignatureParameters, SerializedBlockSignatureParameters> {
  defaults(options:SerializedBlockSignatureParameters):BlockSignatureParameters {
    // Data taken from a real block
    return {
      type: 2,
      data: "t1vv8DSsC2vAVmJsEjVyZgLcYS4+AG0qQzViaVWhfdW24YOt7qkRuDxSftbis/ZlDgCc1sGom26PvnLKLe4H0qJP7B4wW3yw8vp0zovZUV9zW1QkpKGJgO7HIhFlQcg9"
    }
  }

  serializedKeys():Record<KnownKeys<BlockSignatureParameters>, KnownKeys<SerializedBlockSignatureParameters>> {
    return {
      type: "Type", 
      data: "Data"
    }
  }
}

export {
  BlockSignature,
  BlockSignatureParameters,
  SerializedBlockSignatureParameters
};