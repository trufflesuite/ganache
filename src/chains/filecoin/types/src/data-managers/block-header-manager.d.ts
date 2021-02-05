import Manager from "./manager";
import { LevelUp } from "levelup";
import { BlockHeader, BlockHeaderConfig } from "../things/block-header";
export default class BlockHeaderManager extends Manager<
  BlockHeader,
  BlockHeaderConfig
> {
  static initialize(base: LevelUp): Promise<BlockHeaderManager>;
  constructor(base: LevelUp);
  /**
   * Writes the blockHeader object to the underlying database.
   * @param blockHeader
   */
  putBlockHeader(blockHeader: BlockHeader): Promise<void>;
}
