import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/go-data-transfer#ChannelID

type ChannelIDConfig = {
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

class ChannelID
  extends SerializableObject<ChannelIDConfig>
  implements DeserializedObject<ChannelIDConfig> {
  get config(): Definitions<ChannelIDConfig> {
    return {
      initiator: {
        serializedName: "Initiator"
      },
      responder: {
        serializedName: "Responder"
      },
      id: {
        serializedName: "ID"
      }
    };
  }

  initiator: string;
  responder: string;
  id: number;
}

type SerializedChannelID = SerializedObject<ChannelIDConfig>;

export { ChannelID, SerializedChannelID };
