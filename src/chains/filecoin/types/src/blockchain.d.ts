import { Tipset } from "./things/tipset";
import { RootCID } from "./things/root-cid";
import Emittery from "emittery";
import { Address } from "./things/address";
import { DealInfo } from "./things/deal-info";
import Balance from "./things/balance";
import { StartDealParams } from "./things/start-deal-params";
import { RetrievalOrder } from "./things/retrieval-order";
import { FilecoinInternalOptions } from "@ganache/filecoin-options";
import { QueryOffer } from "./things/query-offer";
import { FileRef } from "./things/file-ref";
import { IPFS } from "ipfs";
import TipsetManager from "./data-managers/tipset-manager";
import BlockHeaderManager from "./data-managers/block-header-manager";
export declare type BlockchainEvents = {
  ready(): void;
  tipset: Tipset;
};
export default class Blockchain extends Emittery.Typed<
  BlockchainEvents,
  keyof BlockchainEvents
> {
  #private;
  tipsetManager: TipsetManager | null;
  blockHeaderManager: BlockHeaderManager | null;
  readonly miner: string;
  readonly address: Address;
  get balance(): Balance;
  readonly deals: Array<DealInfo>;
  readonly dealsByCid: Record<string, DealInfo>;
  readonly inProcessDeals: Array<DealInfo>;
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
  get ipfs(): IPFS | null;
  genesisTipset(): Tipset;
  latestTipset(): Tipset;
  mineTipset(numNewBlocks?: number): Promise<void>;
  hasLocal(cid: string): Promise<boolean>;
  private getIPFSObjectSize;
  private downloadFile;
  startDeal(proposal: StartDealParams): Promise<RootCID>;
  createQueryOffer(rootCid: RootCID): Promise<QueryOffer>;
  retrieve(retrievalOrder: RetrievalOrder, ref: FileRef): Promise<void>;
  private logLatestTipset;
}
