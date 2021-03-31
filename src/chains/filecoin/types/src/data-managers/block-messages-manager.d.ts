import Manager from "./manager";
import { LevelUp } from "levelup";
import { BlockMessages, BlockMessagesConfig } from "../things/block-messages";
import { CID } from "../things/cid";
import SignedMessageManager from "./message-manager";
export default class BlockMessagesManager extends Manager<
  BlockMessages,
  BlockMessagesConfig
> {
  #private;
  static initialize(
    base: LevelUp,
    signedMessageManager: SignedMessageManager
  ): Promise<BlockMessagesManager>;
  constructor(base: LevelUp, signedMessageManager: SignedMessageManager);
  putBlockMessages(blockCID: CID, messages: BlockMessages): Promise<void>;
  getBlockMessages(blockCID: CID): Promise<BlockMessages>;
}
