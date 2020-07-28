import { Tipset } from "./things/tipset";
import { Block } from "./things/block";
import { CID } from "./things/cid";
import { RootCID } from "./things/rootcid";
import { utils } from "@ganache/utils";
import Emittery from "emittery";
import { Miner } from "./things/miner";
import { Address } from "./things/address";
import { Deal } from "./things/deal";
import Balance from "./things/balance";
import { StorageProposal } from "./things/storageproposal";
import { DealState } from "./dealstates";
import IPFSServer from "./ipfsserver";

export type BlockchainOptions = {
  blockTime: number;
  ipfsPort: number;
};

export default class Blockchain extends Emittery.Typed<undefined, "ready"> implements BlockchainOptions {
  readonly tipsets: Array<Tipset> = [];
  readonly miner: Miner;
  readonly address: Address;
  readonly balance: Balance;
  readonly deals: Array<Deal> = [];

  private dealsByCid: Record<string, Deal> = {};

  readonly blockTime: number = 0;
  readonly ipfsPort: number = 5001;

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
      this.ipfsServer = new IPFSServer(this.ipfsPort);
      
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
  async mineTipset(numNewBlocks:number = 1):Promise<void> {
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

  async startDeal(proposal:StorageProposal):Promise<RootCID> {
    // Remember, we're not cryptographically valid yet. 
    // Let's just create a random root cid for now.
    let proposalCid = new CID();

    let deal = new Deal({
      proposalCid: new RootCID({
        "/": proposalCid
      }),
      state: DealState.Staged, // Not sure if this is right, but we'll start here
      message: "",
      provider: this.miner,
      pieceCid: new RootCID(),
      size: 2032, // TODO: Need to get the actual size in bytes
      pricePerEpoch: proposal.epochPrice,
      duration: proposal.minBlocksDuration,
      dealId: this.deals.length + 1
    })

    // Because we're not cryptographically valid, let's 
    // register the deal with the newly created CID
    this.dealsByCid[proposalCid.value] = deal;

    this.deals.push(deal)

    return deal.proposalCid;
  }
}