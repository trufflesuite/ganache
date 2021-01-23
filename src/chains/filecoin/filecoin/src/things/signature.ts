import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
import { SigType } from "./sig-type";

// https://pkg.go.dev/github.com/filecoin-project/go-state-types/crypto#Signature

interface SignatureConfig {
  properties: {
    type: {
      type: number;
      serializedType: number;
      serializedName: "Type";
    };
    data: {
      type: Buffer;
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
        defaultValue: SigType.SigTypeUnknown
      },
      data: {
        serializedName: "Data",
        defaultValue: Buffer.from([0])
      }
    };
  }

  type: number;
  data: Buffer;
}

type SerializedSignature = SerializedObject<SignatureConfig>;

export { Signature, SerializedSignature };
