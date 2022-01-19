import Manager from "./manager";
import { LevelUp } from "levelup";
import { BlockHeader, BlockHeaderConfig } from "../things/block-header";

export default class BlockHeaderManager extends Manager<
  BlockHeader,
  BlockHeaderConfig
> {
  static async initialize(base: LevelUp) {
    const manager = new BlockHeaderManager(base);
    return manager;
  }

  constructor(base: LevelUp) {
    super(base, BlockHeader);
  }

  /**
   * Writes the blockHeader object to the underlying database.
   * @param blockHeader -
   */
  async putBlockHeader(blockHeader: BlockHeader) {
    await super.set(blockHeader.cid.value, blockHeader);
  }
}
