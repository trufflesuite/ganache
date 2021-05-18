import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { Message, SerializedMessage } from "./message";
import { SerializedSignature, Signature } from "./signature";
import { CID } from "./cid";
declare type SignedMessageConfig = {
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
declare class SignedMessage
  extends SerializableObject<SignedMessageConfig>
  implements DeserializedObject<SignedMessageConfig> {
  get config(): Definitions<SignedMessageConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<SignedMessageConfig>>
      | Partial<DeserializedObject<SignedMessageConfig>>
  );
  message: Message;
  signature: Signature;
  get cid(): CID;
}
declare type SerializedSignedMessage = SerializedObject<SignedMessageConfig>;
export { SignedMessage, SignedMessageConfig, SerializedSignedMessage };
