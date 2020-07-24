import { Tipset } from "./things/tipset";
import { Block } from "./things/block";
import { RootCID } from "./things/rootcid";
import { utils } from "@ganache/utils";

export type BlockchainOptions = {
  blockTime: number;
};

export default class Blockchain implements BlockchainOptions{
  tipsets: Array<Tipset> = [];
  blockTime: number = 0;

  constructor(options:BlockchainOptions = {} as BlockchainOptions) {
    Object.assign(this, options);

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

  mineTipset():void {
    let newTipset = Tipset.createNewTipsetAsChain(this.latestTipset());
    this.tipsets.push(newTipset);
  }
}