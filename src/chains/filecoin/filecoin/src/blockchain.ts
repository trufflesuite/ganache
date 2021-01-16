import { Tipset } from "./things/tipset";
import { Block } from "./things/block";
import { CID } from "./things/cid";
import { RootCID } from "./things/root-cid";
import { utils } from "@ganache/utils";
import Emittery from "emittery";
import { Miner } from "./things/miner";
import { Address } from "./things/address";
import { Deal } from "./things/deal";
import Balance from "./things/balance";
import { StorageProposal } from "./things/storage-proposal";
import { DealState } from "./deal-state";
import IPFSServer, { IPFSNode } from "./ipfs-server";
import dagCBOR from "ipld-dag-cbor";
import { RetrievalOffer } from "./things/retrieval-offer";
import seedrandom from "seedrandom";
import BN from "bn.js";
import { FilecoinInternalOptions } from "@ganache/filecoin-options";

export type BlockchainEvents = {
  ready(): void;
};

export default class Blockchain extends Emittery.Typed<
  BlockchainEvents,
  keyof BlockchainEvents
> {
  readonly tipsets: Array<Tipset> = [];
  readonly miner: Miner;
  readonly address: Address;
  readonly privateKey: string;

  #balance: Balance;
  get balance(): Balance {
    return this.#balance;
  }

  readonly deals: Array<Deal> = [];
  readonly dealsByCid: Record<string, Deal> = {};
  readonly inProcessDeals: Array<Deal> = [];

  readonly options: FilecoinInternalOptions;

  private ipfsServer: IPFSServer;
  private miningTimeout: NodeJS.Timeout;
  private rng: () => number;

  private ready: boolean;

  constructor(options: FilecoinInternalOptions) {
    super();
    this.options = options;

    if (this.options.miner.blockTime > 0) {
      this.options.miner.automining = false;
    }

    if (this.options.wallet.seed) {
      this.rng = seedrandom.alea(this.options.wallet.seed);
    } else {
      this.rng = Math.random;
    }

    this.miner = new Miner();
    this.address = Address.random(this.rng);
    this.#balance = new Balance();

    this.ready = false;

    // Create genesis tipset
    this.tipsets.push(
      new Tipset({
        blocks: [new Block()],
        height: 0
      })
    );

    setTimeout(async () => {
      // Create the IPFS server
      this.ipfsServer = new IPFSServer(this.options.chain.ipfsPort);

      await this.ipfsServer.start();

      // Fire up the miner if necessary
      if (!this.options.miner.automining && this.options.miner.blockTime != 0) {
        const intervalMine = () => {
          this.mineTipset();
        };

        this.miningTimeout = setInterval(
          intervalMine,
          this.options.miner.blockTime
        );

        utils.unref(this.miningTimeout);
      }

      // Get this party started!
      this.ready = true;
      this.emit("ready");

      // Don't log until things are all ready
      this.logLatestTipset();
    }, 0);
  }

  async waitForReady() {
    return new Promise(resolve => {
      if (this.ready) {
        resolve(void 0);
      } else {
        this.on("ready", resolve);
      }
    });
  }

  /**
   * Gracefully shuts down the blockchain service and all of its dependencies.
   */
  async stop() {
    clearInterval(this.miningTimeout);
    await this.ipfsServer.stop();
  }

  get ipfs(): IPFSNode {
    return this.ipfsServer.node;
  }

  genesisTipset(): Tipset {
    return this.tipsets[0];
  }

  latestTipset(): Tipset {
    return this.tipsets[this.tipsets.length - 1];
  }

  // Note that this is naive - it always assumes the first block in the
  // previous tipset is the parent of the new blocks.
  async mineTipset(numNewBlocks: number = 1): Promise<void> {
    let previousTipset: Tipset = this.latestTipset();

    let newBlocks: Array<Block> = [];

    for (let i = 0; i < numNewBlocks; i++) {
      newBlocks.push(
        new Block({
          miner: this.miner,
          parents: [previousTipset.cids[0]]
        })
      );
    }

    let newTipset = new Tipset({
      blocks: newBlocks,
      height: previousTipset.height + 1
    });

    this.tipsets.push(newTipset);

    // Advance the state of all deals in process.
    for (const deal of this.inProcessDeals) {
      deal.advanceState(this.options.miner.automining);

      if (deal.state == DealState.Active) {
        // Remove the deal from the in-process array
        this.inProcessDeals.splice(this.inProcessDeals.indexOf(deal), 1);
      }
    }

    this.logLatestTipset();
  }

  async hasLocal(cid: string): Promise<boolean> {
    try {
      // This stat will fail if the object doesn't exist.
      await this.ipfsServer.node.object.stat(cid, {
        timeout: 500 // Enforce a timeout; otherwise will hang if CID not found
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  private async getIPFSObjectSize(cid: string): Promise<number> {
    let stat = await this.ipfsServer.node.object.stat(cid, {
      timeout: 500 // Enforce a timeout; otherwise will hang if CID not found
    });

    return stat.DataSize;
  }

  async startDeal(proposal: StorageProposal): Promise<RootCID> {
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
      pieceCid: null,
      size: size,
      pricePerEpoch: proposal.epochPrice,
      duration: proposal.minBlocksDuration,
      dealId: this.deals.length + 1
    });

    // Because we're not cryptographically valid, let's
    // register the deal with the newly created CID
    this.dealsByCid[proposalCid.value] = deal;

    this.deals.push(deal);
    this.inProcessDeals.push(deal);

    // If we're automining, mine a new block. Note that this will
    // automatically advance the deal to the active state.
    if (this.options.miner.automining) {
      while (deal.state != DealState.Active) {
        this.mineTipset();
      }
    }

    // Subtract the cost from our current balance
    let totalPrice = new BN(deal.pricePerEpoch)
      .mul(new BN(deal.duration))
      .toString(10);
    this.#balance = this.#balance.sub(totalPrice);

    return deal.proposalCid;
  }

  async createRetrievalOffer(rootCid: RootCID): Promise<RetrievalOffer> {
    let size = await this.getIPFSObjectSize(rootCid["/"].value);

    return new RetrievalOffer({
      root: rootCid,
      size: size,
      miner: this.miner,
      minPrice: "" + size * 2 // This seems to be what powergate does
    });
  }

  async retrieve(retrievalOffer: RetrievalOffer): Promise<void> {
    // Since this is a simulator, we're not actually interacting with other
    // IPFS and Filecoin nodes. Because of this, there's no need to
    // actually retrieve anything. That said, we'll check to make sure
    // we have the content locally in our IPFS server, and error if it
    // doesn't exist.

    let hasLocal: boolean = await this.hasLocal(retrievalOffer.root["/"].value);

    if (!hasLocal) {
      throw new Error(`Object not found: ${retrievalOffer.root["/"].value}`);
    }

    this.#balance = this.#balance.sub(retrievalOffer.minPrice);
  }

  private logLatestTipset() {
    let date = new Date().toISOString();
    let tipset = this.latestTipset();

    this.options.logging.logger.log(
      `${date} INFO New heaviest tipset! [${tipset.cids[0]["/"].value}] (height=${tipset.height})`
    );
  }
}
