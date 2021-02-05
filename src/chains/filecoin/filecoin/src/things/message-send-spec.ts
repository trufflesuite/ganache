import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/api#MessageSendSpec

type MessageSendSpecConfig = {
  properties: {
    maxFee: {
      type: bigint;
      serializedType: string;
      serializedName: "MaxFee";
    };
  };
};

class MessageSendSpec
  extends SerializableObject<MessageSendSpecConfig>
  implements DeserializedObject<MessageSendSpecConfig> {
  get config(): Definitions<MessageSendSpecConfig> {
    return {
      maxFee: {
        deserializedName: "maxFee",
        serializedName: "MaxFee",
        defaultValue: literal => (literal ? BigInt(literal) : 0n)
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<MessageSendSpecConfig>>
      | Partial<DeserializedObject<MessageSendSpecConfig>>
  ) {
    super();

    this.maxFee = super.initializeValue(this.config.maxFee, options);
  }

  maxFee: bigint;
}

type SerializedMessageSendSpec = SerializedObject<MessageSendSpecConfig>;

export { MessageSendSpec, SerializedMessageSendSpec };
