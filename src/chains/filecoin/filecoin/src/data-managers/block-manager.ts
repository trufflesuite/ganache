import Manager from "./manager";
import { LevelUp } from "levelup";
import { BlockHeader } from "../things/block-header";

export default class BlockHeaderManager extends Manager<BlockHeader> {
  static async initialize(base: LevelUp) {
    const manager = new BlockHeaderManager(base);
    return manager;
  }

  constructor(base: LevelUp) {
    super(base, BlockHeader);
  }

  /**
   * Writes the blockHeader object to the underlying database.
   * @param blockHeader
   */
  async putBlockHeader(blockHeader: BlockHeader) {
    const serializedBlockHeader = blockHeader.serialize();
    super.set(
      Buffer.from(blockHeader.cid.value),
      Buffer.from(JSON.stringify(serializedBlockHeader))
    );
  }
}
