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

type C = MessageSendSpecConfig;

class MessageSendSpec
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C> {
    return {
      maxFee: {
        deserializedName: "maxFee",
        serializedName: "MaxFee",
        defaultValue: literal => (literal ? BigInt(literal) : 0n)
      }
    };
  }

  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  ) {
    super();

    this.maxFee = super.initializeValue(this.config.maxFee, options);
  }

  maxFee: bigint;
}

type SerializedMessageSendSpec = SerializedObject<C>;

export { MessageSendSpec, SerializedMessageSendSpec };
