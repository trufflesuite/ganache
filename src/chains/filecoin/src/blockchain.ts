import { Tipset } from "./things/tipset";

export type BlockchainOptions = {
  blockTime: number;
};

export default class Blockchain implements BlockchainOptions{
  tipsets: Array<Tipset> = [];
  blockTime: number = 1000;

  constructor(options:BlockchainOptions = {} as BlockchainOptions) {
    Object.assign(this, options);

    this.tipsets.push(new Tipset());
  }

  genesisTipset():Tipset {
    return this.tipsets[0];
  }

  latestTipset():Tipset {
    return this.tipsets[this.tipsets.length - 1];
  }

  mine():void {
    this.tipsets.push(new Tipset());
  }
}