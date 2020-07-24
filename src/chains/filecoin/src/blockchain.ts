import { Tipset } from "./things/tipset";
import { Block } from "./things/block";
import { RootCID } from "./things/rootcid";
import { utils } from "@ganache/utils";
import Miner from "./things/miner";

export type BlockchainOptions = {
  blockTime: number;
};

export default class Blockchain implements BlockchainOptions{
  tipsets: Array<Tipset> = [];
  miner: Miner;
  blockTime: number = 0;

  constructor(options:BlockchainOptions = {} as BlockchainOptions) {
    this.blockTime = options.blockTime;
    this.miner = new Miner();

    // Create genesis tipset
    this.tipsets.push(new Tipset({
      cids: [new RootCID()],
      blocks: [
        new Block()
      ],
      height: 0
    }));

    if (this.blockTime != 0) {
      const intervalMine = () => {
        this.mineTipset();
      }

      utils.unref(setInterval(intervalMine, this.blockTime));
    }
  }

  genesisTipset():Tipset {
    return this.tipsets[0];
  }

  latestTipset():Tipset {
    return this.tipsets[this.tipsets.length - 1];
  }

  // Note that this is naive - it always assumes the first block in the 
  // previous tipset is the parent of the new blocks.
  mineTipset(numNewBlocks:number = 1):void {
    let previousTipset:Tipset = this.latestTipset();

    let newBlocks:Array<Block> = [];
    let parentBlock = previousTipset.blocks[0];

    for (let i = 0; i < numNewBlocks; i++) {
      newBlocks.push(new Block({
        miner: this.miner,
        parents: [
          previousTipset.cids[0]
        ]
      }))
    }

    let newTipset = new Tipset({
      blocks: newBlocks,
      height: previousTipset.height + 1
    })

    this.tipsets.push(newTipset);
  }
}