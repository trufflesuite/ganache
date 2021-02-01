import Manager from "./manager";
import { LevelUp } from "levelup";
import { BlockMessages, BlockMessagesConfig } from "../things/block-messages";
import { SignedMessage } from "../things/signed-message";
import { CID } from "../things/cid";
import SignedMessageManager from "./message-manager";
import { SigType } from "../things/sig-type";

export default class BlockMessagesManager extends Manager<
  BlockMessages,
  BlockMessagesConfig
> {
  readonly #signedMessageManager: SignedMessageManager;

  static async initialize(
    base: LevelUp,
    signedMessageManager: SignedMessageManager
  ) {
    const manager = new BlockMessagesManager(base, signedMessageManager);
    return manager;
  }

  constructor(base: LevelUp, signedMessageManager: SignedMessageManager) {
    super(base, BlockMessages);
    this.#signedMessageManager = signedMessageManager;
  }

  async putBlockMessages(blockCID: CID, messages: BlockMessages) {
    // remove messages here as they'll be stored in their own manager
    const blockMessagesCidsOnly = new BlockMessages({
      cids: messages.cids
    });

    await super.set(blockCID.value, blockMessagesCidsOnly);

    for (const message of messages.blsMessages) {
      const signedMessageWrapper = new SignedMessage({
        message,
        Signature: {
          Type: SigType.SigTypeBLS,
          Data: Buffer.from([0]).toString("base64")
        }
      });
      await this.#signedMessageManager.putSignedMessage(signedMessageWrapper);
    }

    for (const message of messages.secpkMessages) {
      await this.#signedMessageManager.putSignedMessage(message);
    }
  }

  async getBlockMessages(blockCID: CID): Promise<BlockMessages> {
    const messages = await super.get(blockCID.value);

    if (!messages) {
      return new BlockMessages();
    }

    for (const cid of messages.cids) {
      const signedMessage = await this.#signedMessageManager.get(
        cid.root.value
      );
      if (!signedMessage) {
        throw new Error(
          `Could not find signed message with cid ${cid.root.value} for block ${blockCID.value}`
        );
      }
      if (signedMessage.signature.type === SigType.SigTypeBLS) {
        messages.blsMessages.push(signedMessage.message);
      } else {
        messages.secpkMessages.push(signedMessage);
      }
    }

    return messages;
  }
}
