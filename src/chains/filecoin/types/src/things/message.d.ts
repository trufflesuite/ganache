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
declare type C = MessageConfig;
declare class Message
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
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
declare type SerializedMessage = SerializedObject<C>;
export { Message, SerializedMessage };
