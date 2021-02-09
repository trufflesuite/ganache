/// <reference types="node" />
import { KeyType } from "./key-type";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
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
declare class KeyInfo
  extends SerializableObject<KeyInfoConfig>
  implements DeserializedObject<KeyInfoConfig> {
  get config(): Definitions<KeyInfoConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<KeyInfoConfig>>
      | Partial<DeserializedObject<KeyInfoConfig>>
  );
  type: KeyType;
  privateKey: Buffer;
}
declare type SerializedKeyInfo = SerializedObject<KeyInfoConfig>;
export { KeyInfo, SerializedKeyInfo };
