/// <reference types="node" />
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
declare type MessageConfig = {
  properties: {
    version: {
      type: number;
      serializedType: number;
      serializedName: "Version";
    };
    to: {
      type: string;
      serializedType: string;
      serializedName: "To";
    };
    from: {
      type: string;
      serializedType: string;
      serializedName: "From";
    };
    nonce: {
      type: number;
      serializedType: number;
      serializedName: "Nonce";
    };
    value: {
      type: bigint;
      serializedType: string;
      serializedName: "Value";
    };
    gasLimit: {
      type: number;
      serializedType: number;
      serializedName: "GasLimit";
    };
    gasFeeCap: {
      type: bigint;
      serializedType: string;
      serializedName: "GasFeeCap";
    };
    gasPremium: {
      type: bigint;
      serializedType: string;
      serializedName: "GasPremium";
    };
    method: {
      type: number;
      serializedType: number;
      serializedName: "Method";
    };
    params: {
      type: Buffer;
      serializedType: string;
      serializedName: "Params";
    };
  };
};
declare class Message
  extends SerializableObject<MessageConfig>
  implements DeserializedObject<MessageConfig> {
  get config(): Definitions<MessageConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<MessageConfig>>
      | Partial<DeserializedObject<MessageConfig>>
  );
  version: number;
  to: string;
  from: string;
  nonce: number;
  value: bigint;
  gasLimit: number;
  gasFeeCap: bigint;
  gasPremium: bigint;
  method: number;
  params: Buffer;
}
declare type SerializedMessage = SerializedObject<MessageConfig>;
export { Message, SerializedMessage };
