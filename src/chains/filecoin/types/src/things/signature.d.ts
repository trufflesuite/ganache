/// <reference types="node" />
import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
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
declare class Signature
  extends SerializableObject<SignatureConfig>
  implements DeserializedObject<SignatureConfig> {
  get config(): Definitions<SignatureConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<SignatureConfig>>
      | Partial<DeserializedObject<SignatureConfig>>
  );
  type: number;
  data: Buffer;
}
declare type SerializedSignature = SerializedObject<SignatureConfig>;
export { Signature, SerializedSignature };
