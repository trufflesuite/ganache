import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
declare type ChannelIDConfig = {
  properties: {
    initiator: {
      type: string;
      serializedType: string;
      serializedName: "Initiator";
    };
    responder: {
      type: string;
      serializedType: string;
      serializedName: "Responder";
    };
    id: {
      type: number;
      serializedType: number;
      serializedName: "ID";
    };
  };
};
declare class ChannelID
  extends SerializableObject<ChannelIDConfig>
  implements DeserializedObject<ChannelIDConfig> {
  get config(): Definitions<ChannelIDConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<ChannelIDConfig>>
      | Partial<DeserializedObject<ChannelIDConfig>>
  );
  initiator: string;
  responder: string;
  id: number;
}
declare type SerializedChannelID = SerializedObject<ChannelIDConfig>;
export { ChannelID, SerializedChannelID };
