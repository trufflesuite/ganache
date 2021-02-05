import { Message, SerializedMessage } from "./message";
import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { SigType } from "./sig-type";
import { SerializedSignedMessage, SignedMessage } from "./signed-message";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/api#BlockMessages

type BlockMessagesConfig = {
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

class BlockMessages
  extends SerializableObject<BlockMessagesConfig>
  implements DeserializedObject<BlockMessagesConfig> {
  get config(): Definitions<BlockMessagesConfig> {
    return {
      blsMessages: {
        deserializedName: "blsMessages",
        serializedName: "BlsMessages",
        defaultValue: options =>
          options ? options.map(message => new Message(message)) : []
      },
      secpkMessages: {
        deserializedName: "secpkMessages",
        serializedName: "SecpkMessages",
        defaultValue: options =>
          options ? options.map(message => new SignedMessage(message)) : []
      },
      cids: {
        deserializedName: "cids",
        serializedName: "Cids",
        defaultValue: options =>
          options ? options.map(rootCid => new RootCID(rootCid)) : []
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<BlockMessagesConfig>>
      | Partial<DeserializedObject<BlockMessagesConfig>>
  ) {
    super();

    this.blsMessages = super.initializeValue(this.config.blsMessages, options);
    this.secpkMessages = super.initializeValue(
      this.config.secpkMessages,
      options
    );
    this.cids = super.initializeValue(this.config.cids, options);
    this.initializeCids();
  }

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

  // Reference implementation: https://git.io/JtW8K
  initializeCids() {
    if (
      this.cids.length !==
      this.blsMessages.length + this.secpkMessages.length
    ) {
      for (const blsMessage of this.blsMessages) {
        this.cids.push(
          new RootCID({
            root: blsMessage.cid
          })
        );
      }
      for (const secpkMessage of this.secpkMessages) {
        this.cids.push(
          new RootCID({
            root: secpkMessage.cid
          })
        );
      }
    }
  }

  static fromSignedMessages(
    signedMessages: Array<SignedMessage>
  ): BlockMessages {
    const blockMessages = new BlockMessages();

    for (const signedMessage of signedMessages) {
      if (signedMessage.signature.type === SigType.SigTypeBLS) {
        blockMessages.blsMessages.push(signedMessage.message);
      } else {
        blockMessages.secpkMessages.push(signedMessage);
      }
    }

    blockMessages.initializeCids();

    return blockMessages;
  }
}

type SerializedBlockMessages = SerializedObject<BlockMessagesConfig>;

export { BlockMessages, BlockMessagesConfig, SerializedBlockMessages };
