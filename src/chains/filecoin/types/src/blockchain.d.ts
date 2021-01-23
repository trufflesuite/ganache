import { Tipset } from "./things/tipset";
import { RootCID } from "./things/root-cid";
import Emittery from "emittery";
import { Miner } from "./things/miner";
import { Address } from "./things/address";
import { Deal } from "./things/deal";
import Balance from "./things/balance";
import { StorageProposal } from "./things/storage-proposal";
import { IPFSNode } from "./ipfs-server";
import { RetrievalOffer } from "./things/retrieval-offer";
import { FilecoinInternalOptions } from "@ganache/filecoin-options";
export declare type BlockchainEvents = {
  ready(): void;
};
export default class Blockchain extends Emittery.Typed<
  BlockchainEvents,
  keyof BlockchainEvents
> {
  #private;
  readonly tipsets: Array<Tipset>;
  readonly miner: Miner;
  readonly address: Address;
  readonly privateKey: string;
  get balance(): Balance;
  readonly deals: Array<Deal>;
  readonly dealsByCid: Record<string, Deal>;
  readonly inProcessDeals: Array<Deal>;
  readonly options: FilecoinInternalOptions;
  private ipfsServer;
  private miningTimeout;
  private rng;
  private ready;
  constructor(options: FilecoinInternalOptions);
  waitForReady(): Promise<unknown>;
  /**
   * Gracefully shuts down the blockchain service and all of its dependencies.
   */
  stop(): Promise<void>;
  get ipfs(): IPFSNode;
  genesisTipset(): Tipset;
  latestTipset(): Tipset;
  mineTipset(numNewBlocks?: number): Promise<void>;
  hasLocal(cid: string): Promise<boolean>;
  private getIPFSObjectSize;
  startDeal(proposal: StorageProposal): Promise<RootCID>;
  createRetrievalOffer(rootCid: RootCID): Promise<RetrievalOffer>;
  retrieve(retrievalOffer: RetrievalOffer): Promise<void>;
  private logLatestTipset;
}
