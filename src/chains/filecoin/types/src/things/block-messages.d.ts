import { Message, SerializedMessage } from "./message";
import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { SerializedSignedMessage, SignedMessage } from "./signed-message";
declare type BlockMessagesConfig = {
  properties: {
    blsMessages: {
      type: Array<Message>;
      serializedType: Array<SerializedMessage>;
      serializedName: "BlsMessages";
    };
    secpkMessages: {
      type: Array<SignedMessage>;
      serializedType: Array<SerializedSignedMessage>;
      serializedName: "SecpkMessages";
    };
    cids: {
      type: Array<RootCID>;
      serializedType: Array<SerializedRootCID>;
      serializedName: "Cids";
    };
  };
};
declare type C = BlockMessagesConfig;
declare class BlockMessages
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  /**
   * The messages in the block that were signed with BLS.
   * In Ganache, this should always contain all of the
   * messages due to always signing new blocks with BLS.
   */
  blsMessages: Array<Message>;
  /**
   * The messages in the block that were signed with Secpk.
   * In Ganache, this should always be empty due to always
   * signing new blocks with BLS.
   */
  secpkMessages: Array<SignedMessage>;
  cids: Array<RootCID>;
  initializeCids(): void;
  static fromSignedMessages(
    signedMessages: Array<SignedMessage>
  ): BlockMessages;
}
declare type SerializedBlockMessages = SerializedObject<C>;
export { BlockMessages, BlockMessagesConfig, SerializedBlockMessages };
