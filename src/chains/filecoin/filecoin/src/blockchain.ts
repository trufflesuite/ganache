import { Tipset } from "./things/tipset";
import { BlockHeader } from "./things/block-header";
import { CID } from "./things/cid";
import { RootCID } from "./things/root-cid";
import { utils } from "@ganache/utils";
import Emittery from "emittery";
import { Address } from "./things/address";
import { DealInfo } from "./things/deal-info";
import Balance from "./things/balance";
import { StartDealParams } from "./things/start-deal-params";
import { StorageDealStatus } from "./types/storage-deal-status";
import IPFSServer, { IPFSNode } from "./ipfs-server";
import dagCBOR from "ipld-dag-cbor";
import { RetrievalOrder } from "./things/retrieval-order";
import { FilecoinInternalOptions } from "@ganache/filecoin-options";
import { QueryOffer } from "./things/query-offer";
import { RandomNumberGenerator } from "@ganache/utils/src/utils";
import { Ticket } from "./things/ticket";

export type BlockchainEvents = {
  ready(): void;
  tipset: Tipset;
};

export default class Blockchain extends Emittery.Typed<
  BlockchainEvents,
  keyof BlockchainEvents
> {
  readonly tipsets: Array<Tipset> = [];
  readonly miner: string; // using string until we can support more address types in Address
  readonly address: Address;
  readonly privateKey: string;

  #balance: Balance;
  get balance(): Balance {
    return this.#balance;
  }

  readonly deals: Array<DealInfo> = [];
  readonly dealsByCid: Record<string, DealInfo> = {};
  readonly inProcessDeals: Array<DealInfo> = [];

  readonly options: FilecoinInternalOptions;

  private ipfsServer: IPFSServer;
  private miningTimeout: NodeJS.Timeout;
  private rng: RandomNumberGenerator;

  private ready: boolean;

  constructor(options: FilecoinInternalOptions) {
    super();
    this.options = options;

    this.rng = new RandomNumberGenerator(this.options.wallet.seed);

    this.miner = "t01000";
    this.address = Address.random(this.rng);
    this.#balance = new Balance();

    this.ready = false;

    // Create genesis tipset
    const genesisBlock = new BlockHeader({
      ticket: new Ticket({
        // Reference implementation https://git.io/Jt31s
        vrfProof: this.rng.getBuffer(32)
      }),
      parents: [
        // Both lotus and lotus-devnet always have the Filecoin genesis CID
        // hardcoded here. Reference implementation: https://git.io/Jt3oK
        new RootCID({
          "/": "bafyreiaqpwbbyjo4a42saasj36kkrpv4tsherf2e7bvezkert2a7dhonoi"
        })
      ]
    });
    this.tipsets.push(
      new Tipset({
        blocks: [genesisBlock],
        height: 0
      })
    );

    setTimeout(async () => {
      // Create the IPFS server
      this.ipfsServer = new IPFSServer(this.options.chain.ipfsPort);

      await this.ipfsServer.start();

      // Fire up the miner if necessary
      if (this.options.miner.blockTime > 0) {
        const intervalMine = () => {
          this.mineTipset();
        };

        this.miningTimeout = setInterval(
          intervalMine,
          this.options.miner.blockTime * 1000
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
    const newTipsetHeight = previousTipset.height + 1;

    let newBlocks: Array<BlockHeader> = [];

    for (let i = 0; i < numNewBlocks; i++) {
      newBlocks.push(
        new BlockHeader({
          miner: this.miner,
          parents: [previousTipset.cids[0]],
          height: newTipsetHeight
        })
      );
    }

    let newTipset = new Tipset({
      blocks: newBlocks,
      height: newTipsetHeight
    });

    this.tipsets.push(newTipset);

    // Advance the state of all deals in process.
    for (const deal of this.inProcessDeals) {
      deal.advanceState();

      if (deal.state == StorageDealStatus.Active) {
        // Remove the deal from the in-process array
        this.inProcessDeals.splice(this.inProcessDeals.indexOf(deal), 1);
      }
    }

    this.logLatestTipset();

    this.emit("tipset", newTipset);
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

  async startDeal(proposal: StartDealParams): Promise<RootCID> {
    // Get size of IPFS object represented by the proposal
    let size = await this.getIPFSObjectSize(proposal.data.root["/"].value);

    let signature = await this.address.signProposal(proposal);

    // TODO: I'm not sure if should pass in a hex string or the Buffer alone.
    // I *think* it's the string, as that matches my understanding of the Go code.
    // That said, node that Buffer vs. hex string returns a different CID...
    let proposalRawCid = await dagCBOR.util.cid(signature.toString("hex"));
    let proposalCid = new CID(proposalRawCid.toString());

    let deal = new DealInfo({
      proposalCid: new RootCID({
        "/": proposalCid
      }),
      state: StorageDealStatus.Validating, // Not sure if this is right, but we'll start here
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
    if (this.options.miner.blockTime === 0) {
      while (deal.state !== StorageDealStatus.Active) {
        this.mineTipset();
      }
    }

    // Subtract the cost from our current balance
    let totalPrice = BigInt(deal.pricePerEpoch) * BigInt(deal.duration);
    this.#balance = this.#balance.sub(totalPrice);

    return deal.proposalCid;
  }

  async createQueryOffer(rootCid: RootCID): Promise<QueryOffer> {
    let size = await this.getIPFSObjectSize(rootCid["/"].value);

    return new QueryOffer({
      root: rootCid,
      size: size,
      miner: this.miner,
      minPrice: BigInt(size * 2) // This seems to be what powergate does
    });
  }

  async retrieve(retrievalOrder: RetrievalOrder): Promise<void> {
    // Since this is a simulator, we're not actually interacting with other
    // IPFS and Filecoin nodes. Because of this, there's no need to
    // actually retrieve anything. That said, we'll check to make sure
    // we have the content locally in our IPFS server, and error if it
    // doesn't exist.

    let hasLocal: boolean = await this.hasLocal(retrievalOrder.root["/"].value);

    if (!hasLocal) {
      throw new Error(`Object not found: ${retrievalOrder.root["/"].value}`);
    }

    this.#balance = this.#balance.sub(retrievalOrder.total);
  }

  private logLatestTipset() {
    let date = new Date().toISOString();
    let tipset = this.latestTipset();

    this.options.logging.logger.log(
      `${date} INFO New heaviest tipset! [${tipset.cids[0]["/"].value}] (height=${tipset.height})`
    );
  }
}
