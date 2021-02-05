import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/go-data-transfer@v1.2.5#ChannelID

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
        deserializedName: "initiator",
        serializedName: "Initiator",
        defaultValue: ""
      },
      responder: {
        deserializedName: "responder",
        serializedName: "Responder",
        defaultValue: ""
      },
      id: {
        deserializedName: "id",
        serializedName: "ID",
        defaultValue: 0
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<ChannelIDConfig>>
      | Partial<DeserializedObject<ChannelIDConfig>>
  ) {
    super();

    this.initiator = super.initializeValue(this.config.initiator, options);
    this.responder = super.initializeValue(this.config.responder, options);
    this.id = super.initializeValue(this.config.id, options);
  }

  initiator: string;
  responder: string;
  id: number;
}

type SerializedChannelID = SerializedObject<ChannelIDConfig>;

export { ChannelID, SerializedChannelID };
