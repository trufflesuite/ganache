import { Tipset } from "./things/tipset";
import { RootCID } from "./things/root-cid";
import Emittery from "emittery";
import { DealInfo } from "./things/deal-info";
import { StartDealParams } from "./things/start-deal-params";
import { RetrievalOrder } from "./things/retrieval-order";
import { FilecoinInternalOptions } from "@ganache/filecoin-options";
import { QueryOffer } from "./things/query-offer";
import { FileRef } from "./things/file-ref";
import { IPFS } from "ipfs";
import { Account } from "./things/account";
import TipsetManager from "./data-managers/tipset-manager";
import BlockHeaderManager from "./data-managers/block-header-manager";
import { SignedMessage } from "./things/signed-message";
import { Message } from "./things/message";
import { MessageSendSpec } from "./things/message-send-spec";
import { Address, AddressProtocol } from "./things/address";
import SignedMessageManager from "./data-managers/message-manager";
import BlockMessagesManager from "./data-managers/block-messages-manager";
import AccountManager from "./data-managers/account-manager";
import PrivateKeyManager from "./data-managers/private-key-manager";
import DealInfoManager from "./data-managers/deal-info-manager";
export declare type BlockchainEvents = {
  ready(): void;
  tipset: Tipset;
  minerEnabled: boolean;
  dealUpdate: DealInfo;
};
export default class Blockchain extends Emittery.Typed<
  BlockchainEvents,
  keyof BlockchainEvents
> {
  #private;
  tipsetManager: TipsetManager | null;
  blockHeaderManager: BlockHeaderManager | null;
  accountManager: AccountManager | null;
  privateKeyManager: PrivateKeyManager | null;
  signedMessagesManager: SignedMessageManager | null;
  blockMessagesManager: BlockMessagesManager | null;
  dealInfoManager: DealInfoManager | null;
  readonly miner: Address;
  get minerEnabled(): boolean;
  messagePool: Array<SignedMessage>;
  readonly options: FilecoinInternalOptions;
  private ipfsServer;
  private miningTimeout;
  private rng;
  get dbDirectory(): string | null;
  private ready;
  private stopped;
  constructor(options: FilecoinInternalOptions);
  initialize(): Promise<void>;
  waitForReady(): Promise<unknown>;
  /**
   * Gracefully shuts down the blockchain service and all of its dependencies.
   */
  stop(): Promise<void>;
  get ipfs(): IPFS | null;
  private intervalMine;
  enableMiner(): Promise<void>;
  disableMiner(): Promise<void>;
  genesisTipset(): Tipset;
  latestTipset(): Tipset;
  push(message: Message, spec: MessageSendSpec): Promise<SignedMessage>;
  pushSigned(
    signedMessage: SignedMessage,
    acquireLock?: boolean
  ): Promise<RootCID>;
  mpoolClear(local: boolean): Promise<void>;
  mpoolPending(): Promise<Array<SignedMessage>>;
  mineTipset(numNewBlocks?: number): Promise<void>;
  hasLocal(cid: string): Promise<boolean>;
  private getIPFSObjectSize;
  private downloadFile;
  startDeal(proposal: StartDealParams): Promise<RootCID>;
  createQueryOffer(rootCid: RootCID): Promise<QueryOffer>;
  retrieve(retrievalOrder: RetrievalOrder, ref: FileRef): Promise<void>;
  getTipsetFromKey(tipsetKey?: Array<RootCID>): Promise<Tipset>;
  getTipsetByHeight(
    height: number,
    tipsetKey?: Array<RootCID>
  ): Promise<Tipset>;
  createAccount(protocol: AddressProtocol): Promise<Account>;
  private logLatestTipset;
}
