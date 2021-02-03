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

type C = SignatureConfig;

class Signature extends SerializableObject<C> implements DeserializedObject<C> {
  get config(): Definitions<C> {
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
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  ) {
    super();

    this.type = super.initializeValue(this.config.type, options);
    this.data = super.initializeValue(this.config.data, options);
  }

  type: number;
  data: Buffer;
}

type SerializedSignature = SerializedObject<C>;

export { Signature, SerializedSignature };
