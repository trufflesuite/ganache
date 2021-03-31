import { KeyType } from "./key-type";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/chain/types#KeyInfo

interface KeyInfoConfig {
  properties: {
    type: {
      type: KeyType;
      serializedType: KeyType;
      serializedName: "Type";
    };
    privateKey: {
      type: Buffer;
      serializedType: string;
      serializedName: "PrivateKey";
    };
  };
}

class KeyInfo
  extends SerializableObject<KeyInfoConfig>
  implements DeserializedObject<KeyInfoConfig> {
  get config(): Definitions<KeyInfoConfig> {
    return {
      type: {
        deserializedName: "type",
        serializedName: "Type",
        defaultValue: KeyType.KeyTypeBLS
      },
      privateKey: {
        deserializedName: "privateKey",
        serializedName: "PrivateKey",
        defaultValue: literal =>
          typeof literal !== "undefined"
            ? Buffer.from(literal, "base64")
            : Buffer.from([0])
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<KeyInfoConfig>>
      | Partial<DeserializedObject<KeyInfoConfig>>
  ) {
    super();

    this.type = super.initializeValue(this.config.type, options);
    this.privateKey = super.initializeValue(this.config.privateKey, options);
  }

  type: KeyType;
  privateKey: Buffer;
}

type SerializedKeyInfo = SerializedObject<KeyInfoConfig>;

export { KeyInfo, SerializedKeyInfo };
