import Manager from "./manager";
import { LevelUp } from "levelup";
import { Tipset, TipsetConfig } from "../things/tipset";
import BlockHeaderManager from "./block-header-manager";

export default class TipsetManager extends Manager<Tipset, TipsetConfig> {
  /**
   * The earliest tipset
   */
  public earliest: Tipset | null = null;

  /**
   * The latest tipset
   */
  public latest: Tipset | null = null;

  readonly #blockHeaderManager: BlockHeaderManager;

  static async initialize(
    base: LevelUp,
    blockHeaderManager: BlockHeaderManager
  ) {
    const manager = new TipsetManager(base, blockHeaderManager);
    return manager;
  }

  constructor(base: LevelUp, blockHeaderManager: BlockHeaderManager) {
    super(base, Tipset);
    this.#blockHeaderManager = blockHeaderManager;
  }

  /**
   * Writes the tipset object to the underlying database.
   * @param tipset -
   */
  async putTipset(tipset: Tipset) {
    // remove blocks array here as they'll be stored in their own manager
    const tipsetWithoutBlocks = new Tipset({
      height: tipset.height,
      cids: tipset.cids
    });

    await super.set(tipset.height, tipsetWithoutBlocks);

    for (const block of tipset.blocks) {
      await this.#blockHeaderManager.putBlockHeader(block);
    }

    this.latest = tipset;
  }

  async getTipsetWithBlocks(height: number): Promise<Tipset | null> {
    const tipset = await super.get(height);
    if (tipset === null) {
      return null;
    }

    await this.fillTipsetBlocks(tipset);
    return tipset;
  }

  async fillTipsetBlocks(tipset: Tipset) {
    if (tipset.blocks.length === tipset.cids.length) {
      // don't bother fetching blocks if we already have the amount we need
      return;
    }

    // if we don't have all of them, let's refetch all even if we have some
    // we shouldn't really have a some, but not all, case. however, this ensures
    // we get all of the blocks and they're in the correct order
    tipset.blocks = [];

    for (const cid of tipset.cids) {
      const cidString = cid.root.value;
      const blockHeader = await this.#blockHeaderManager.get(
        Buffer.from(cidString)
      );
      if (!blockHeader) {
        throw new Error(
          `Could not find block with cid ${cidString} for tipset ${tipset.height}`
        );
      }
      tipset.blocks.push(blockHeader);
    }
  }
}
