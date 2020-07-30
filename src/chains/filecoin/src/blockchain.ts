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
import IPFSServer, { IPFSNode } from "./ipfsserver";
import dagCBOR from "ipld-dag-cbor";
import { RemoteOffer } from "./things/remoteoffer";

export type BlockchainOptions = {
  automining: boolean;
  blockTime: number;
  ipfsPort: number;
};

export type BlockchainEvents = {
  ready():void;
}

export default class Blockchain extends Emittery.Typed<BlockchainEvents, keyof BlockchainEvents> implements BlockchainOptions {
  readonly tipsets:Array<Tipset> = [];
  readonly miner:Miner;
  readonly address:Address;
  readonly balance:Balance;
  readonly deals:Array<Deal> = [];

  readonly dealsByCid:Record<string, Deal> = {};
  readonly inProcessDeals:Array<Deal> = [];

  readonly automining:boolean = true;
  readonly blockTime:number = 0;
  readonly ipfsPort:number = 5001;

  private ipfsServer:IPFSServer;
  private miningTimeout:NodeJS.Timeout;

  private ready:boolean;

  constructor(options:Partial<BlockchainOptions> = {} as Partial<BlockchainOptions>) {
    super();
    Object.assign(this, options);

    if (this.blockTime > 0) {
      this.automining = false;
    }
    
    this.miner = new Miner();
    this.address = new Address();
    this.balance = new Balance();

    this.ready = false;

    // Create genesis tipset
    this.tipsets.push(new Tipset({
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
      if (!this.automining && this.blockTime != 0) {
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

  get ipfs():IPFSNode {
    return this.ipfsServer.node;
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

    // Advance the state of all deals in process. 
    for (const deal of this.inProcessDeals) {
      deal.advanceState(this.automining);

      if (deal.state == DealState.Active) {
        // Remove the deal from the in-process array
        this.inProcessDeals.splice(this.inProcessDeals.indexOf(deal), 1);
      }
    }
  }

  private async getIPFSObjectSize(cid:string):Promise<number> {
    let stat = await this.ipfsServer.node.object.stat(cid);

    return stat.DataSize;
  }

  async startDeal(proposal:StorageProposal):Promise<RootCID> {
    // Get size of IPFS object represented by the proposal
    let size = await this.getIPFSObjectSize(proposal.data.root["/"].value);

    let signature = await this.address.signProposal(proposal);

    // TODO: I'm not sure if should pass in a hex string or the Buffer alone.
    // I *think* it's the string, as that matches my understanding of the Go code.
    // That said, node that Buffer vs. hex string returns a different CID...
    let proposalRawCid = await dagCBOR.util.cid(signature.toString("hex"));
    let proposalCid = new CID(proposalRawCid.toString());

    let deal = new Deal({
      proposalCid: new RootCID({
        "/": proposalCid
      }),
      state: DealState.Validating, // Not sure if this is right, but we'll start here
      message: "",
      provider: this.miner,
      pieceCid: new RootCID(),
      size: size,
      pricePerEpoch: proposal.epochPrice,
      duration: proposal.minBlocksDuration,
      dealId: this.deals.length + 1
    })

    // Because we're not cryptographically valid, let's 
    // register the deal with the newly created CID
    this.dealsByCid[proposalCid.value] = deal;

    this.deals.push(deal);
    this.inProcessDeals.push(deal);

    // If we're automining, mine a new block. Note that this will
    // automatically advance the deal to the active state.
    if (this.automining) {
      while (deal.state != DealState.Active) {
        this.mineTipset();
      }
    }

    return deal.proposalCid;
  }

  async createRemoteOffer(rootCid:RootCID):Promise<RemoteOffer> {
    let size = await this.getIPFSObjectSize(rootCid["/"].value);

    return new RemoteOffer({
      size: size,
      miner: this.miner,
      minPrice: "" + (size * 2) // This seems to be what powergate does
    });
  }
}