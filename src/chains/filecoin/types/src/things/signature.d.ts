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
declare type C = SignatureConfig;
declare class Signature
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  type: number;
  data: Buffer;
}
declare type SerializedSignature = SerializedObject<C>;
export { Signature, SerializedSignature };
