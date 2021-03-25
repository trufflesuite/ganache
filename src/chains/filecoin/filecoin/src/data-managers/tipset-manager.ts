import Manager from "./manager";
import { LevelUp } from "levelup";
import { Tipset } from "../things/tipset";
import BlockHeaderManager from "./block-manager";

export default class TipsetManager extends Manager<Tipset> {
  /**
   * The earliest tipset
   */
  public earliest: Tipset;

  /**
   * The latest tipset
   */
  public latest: Tipset;

  readonly #blockHeaderManager: BlockHeaderManager;

  static async initialize(
    base: LevelUp,
    blockHeaderManager: BlockHeaderManager
  ) {
    const manager = new TipsetManager(base, blockHeaderManager);
    try {
      await manager.updateTaggedTipsets();
    } catch (e) {
      // it's possible we won't have anything yet for brand new db's
      console.log("TODO:");
      console.log(e);
    }
    return manager;
  }

  constructor(base: LevelUp, blockHeaderManager: BlockHeaderManager) {
    super(base, Tipset);
    this.#blockHeaderManager = blockHeaderManager;
  }

  /**
   * Writes the tipset object to the underlying database.
   * @param tipset
   */
  async putTipset(tipset: Tipset) {
    const serializedTipset = {
      ...tipset.serialize(),
      blocks: [] // remove blocks array here as they'll be stored in their own manager
    };
    super.set(
      Buffer.from([tipset.height]),
      Buffer.from(JSON.stringify(serializedTipset))
    );
    for (const block of tipset.blocks) {
      await this.#blockHeaderManager.putBlockHeader(block);
    }

    await this.updateTaggedTipsets();
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
      const cidString = cid["/"].value;
      const blockHeader = await this.#blockHeaderManager.get(
        Buffer.from(cidString)
      );
      tipset.blocks.push(blockHeader);
    }
  }

  updateTaggedTipsets() {
    return new Promise<Tipset>((resolve, reject) => {
      this.base
        .createValueStream({ limit: 1 })
        .on("data", (data: Buffer) => {
          this.earliest = new Tipset(JSON.parse(data.toString()));
          this.fillTipsetBlocks(this.earliest);
        })
        .on("error", (err: Error) => {
          reject(err);
        })
        .on("end", () => {
          resolve(void 0);
        });

      this.base
        .createValueStream({ reverse: true, limit: 1 })
        .on("data", (data: Buffer) => {
          this.latest = new Tipset(JSON.parse(data.toString()));
          this.fillTipsetBlocks(this.latest);
        })
        .on("error", (err: Error) => {
          reject(err);
        })
        .on("end", () => {
          resolve(void 0);
        });
    });
  }
}
