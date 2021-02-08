import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
import { SigType } from "./sig-type";

// https://pkg.go.dev/github.com/filecoin-project/go-state-types@v0.0.0-20201203022337-7cab7f0d4bfb/crypto#Signature

interface SignatureConfig {
  properties: {
    type: {
      type: SigType;
      serializedType: SigType;
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
        deserializedName: "type",
        serializedName: "Type",
        defaultValue: SigType.SigTypeUnknown
      },
      data: {
        deserializedName: "data",
        serializedName: "Data",
        defaultValue: literal =>
          typeof literal !== "undefined"
            ? Buffer.from(literal, "base64")
            : Buffer.from([0])
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<SignatureConfig>>
      | Partial<DeserializedObject<SignatureConfig>>
  ) {
    super();

    this.type = super.initializeValue(this.config.type, options);
    this.data = super.initializeValue(this.config.data, options);
  }

  type: number;
  data: Buffer;
}

type SerializedSignature = SerializedObject<SignatureConfig>;

export { Signature, SerializedSignature };
