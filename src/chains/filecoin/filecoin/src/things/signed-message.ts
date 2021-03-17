import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { Message, SerializedMessage } from "./message";
import { SerializedSignature, Signature } from "./signature";
import { CID } from "./cid";
import { SigType } from "./sig-type";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/chain/types#SignedMessage

type SignedMessageConfig = {
  properties: {
    message: {
      type: Message;
      serializedType: SerializedMessage;
      serializedName: "Message";
    };
    signature: {
      type: Signature;
      serializedType: SerializedSignature;
      serializedName: "Signature";
    };
  };
};

class SignedMessage
  extends SerializableObject<SignedMessageConfig>
  implements DeserializedObject<SignedMessageConfig> {
  get config(): Definitions<SignedMessageConfig> {
    return {
      message: {
        deserializedName: "message",
        serializedName: "Message",
        defaultValue: options => new Message(options)
      },
      signature: {
        deserializedName: "signature",
        serializedName: "Signature",
        defaultValue: options => new Signature(options)
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<SignedMessageConfig>>
      | Partial<DeserializedObject<SignedMessageConfig>>
  ) {
    super();

    this.message = super.initializeValue(this.config.message, options);
    this.signature = super.initializeValue(this.config.signature, options);
  }

  message: Message;
  signature: Signature;

  // Reference implementation: https://git.io/Jt53i
  get cid(): CID {
    if (this.signature.type === SigType.SigTypeBLS) {
      return this.message.cid;
    } else {
      return super.cid;
    }
  }
}

type SerializedSignedMessage = SerializedObject<SignedMessageConfig>;

export { SignedMessage, SignedMessageConfig, SerializedSignedMessage };
