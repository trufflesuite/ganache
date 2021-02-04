import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
declare type MessageSendSpecConfig = {
  properties: {
    maxFee: {
      type: bigint;
      serializedType: string;
      serializedName: "MaxFee";
    };
  };
};
declare type C = MessageSendSpecConfig;
declare class MessageSendSpec
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  maxFee: bigint;
}
declare type SerializedMessageSendSpec = SerializedObject<C>;
export { MessageSendSpec, SerializedMessageSendSpec };
