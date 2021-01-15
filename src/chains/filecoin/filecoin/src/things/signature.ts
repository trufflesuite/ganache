import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/go-state-types/crypto#Signature

interface SignatureConfig {
  properties: {
    type: {
      type: number;
      serializedType: number;
      serializedName: "Type";
    };
    data: {
      type: string; // should probably be uint8array https://pkg.go.dev/github.com/filecoin-project/go-state-types/crypto#Signature
      serializedType: string;
      serializedName: "Data";
    };
  };
}

class Signature
  extends SerializableObject<SignatureConfig>
  implements DeserializedObject<SignatureConfig> {
  get config(): Definitions<SignatureConfig> {
    return {
      type: {
        serializedName: "Type",
        defaultValue: 2
      },
      data: {
        serializedName: "Data",
        defaultValue:
          "t1vv8DSsC2vAVmJsEjVyZgLcYS4+AG0qQzViaVWhfdW24YOt7qkRuDxSftbis/ZlDgCc1sGom26PvnLKLe4H0qJP7B4wW3yw8vp0zovZUV9zW1QkpKGJgO7HIhFlQcg9"
      }
    };
  }

  type: number;
  data: string;
}

type SerializedSignature = SerializedObject<SignatureConfig>;

export { Signature, SerializedSignature };
