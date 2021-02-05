import Manager from "./manager";
import { LevelUp } from "levelup";
import { Tipset, TipsetConfig } from "../things/tipset";
import BlockHeaderManager from "./block-header-manager";
export default class TipsetManager extends Manager<Tipset, TipsetConfig> {
  #private;
  /**
   * The earliest tipset
   */
  earliest: Tipset | null;
  /**
   * The latest tipset
   */
  latest: Tipset | null;
  static initialize(
    base: LevelUp,
    blockHeaderManager: BlockHeaderManager
  ): Promise<TipsetManager>;
  constructor(base: LevelUp, blockHeaderManager: BlockHeaderManager);
  /**
   * Writes the tipset object to the underlying database.
   * @param tipset
   */
  putTipset(tipset: Tipset): Promise<void>;
  getTipsetWithBlocks(height: number): Promise<Tipset | null>;
  fillTipsetBlocks(tipset: Tipset): Promise<void>;
}
