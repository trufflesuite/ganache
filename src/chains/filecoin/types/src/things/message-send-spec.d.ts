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
declare class MessageSendSpec
  extends SerializableObject<MessageSendSpecConfig>
  implements DeserializedObject<MessageSendSpecConfig> {
  get config(): Definitions<MessageSendSpecConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<MessageSendSpecConfig>>
      | Partial<DeserializedObject<MessageSendSpecConfig>>
  );
  maxFee: bigint;
}
declare type SerializedMessageSendSpec = SerializedObject<MessageSendSpecConfig>;
export { MessageSendSpec, SerializedMessageSendSpec };
