import { Tipset } from "./things/tipset";
import { Block } from "./things/block";
import { RootCID } from "./things/rootcid";
import { utils } from "@ganache/utils";
import { IPFSServer } from "ipfsd-ctl";
import Emittery from "emittery";
import Miner from "./things/miner";
import Address from "./things/address";
import Balance from "./things/balance";
import createIPFSServer from "./ipfsserver"

export type BlockchainOptions = {
  blockTime: number;
  ipfsPort: number;
};

export default class Blockchain extends Emittery.Typed<undefined, "ready"> implements BlockchainOptions {
  readonly tipsets: Array<Tipset> = [];
  readonly miner: Miner;
  readonly address: Address;
  readonly balance: Balance;
  readonly blockTime: number = 0;
  readonly ipfsPort: 4002;

  private ipfsServer: IPFSServer;
  private miningTimeout:NodeJS.Timeout;

  private ready:boolean;

  constructor(options:Partial<BlockchainOptions> = {} as Partial<BlockchainOptions>) {
    super();
    Object.assign(this, options);
    
    this.miner = new Miner();
    this.address = new Address();
    this.balance = new Balance();

    this.ready = false;

    // Create genesis tipset
    this.tipsets.push(new Tipset({
      cids: [new RootCID()],
      blocks: [
        new Block()
      ],
      height: 0
    }));

    setTimeout(async() => {
      // Create the IPFS server
      this.ipfsServer = await createIPFSServer(this.ipfsPort);
      
      await this.ipfsServer.start();

      // Fire up the miner if necessary
      if (this.blockTime != 0) {
        const intervalMine = () => {
          this.mineTipset();
        }
  
        this.miningTimeout = setInterval(intervalMine, this.blockTime);

        utils.unref(this.miningTimeout);
      }

      // Get this party started!
      this.ready = true;
      this.emit("ready");
    })    
  }

  async waitForReady() {
    return new Promise(resolve => {
      if (this.ready) {
        resolve();
      } else {
        this.on("ready", resolve);
      }
    })
  }

  /**
   * Gracefully shuts down the blockchain service and all of its dependencies.
   */
  async stop() {
    clearInterval(this.miningTimeout);
    await this.ipfsServer.stop();
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