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
declare type C = ChannelIDConfig;
declare class ChannelID
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  initiator: string;
  responder: string;
  id: number;
}
declare type SerializedChannelID = SerializedObject<C>;
export { ChannelID, SerializedChannelID };
