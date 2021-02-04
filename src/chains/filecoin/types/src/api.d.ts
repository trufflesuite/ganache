import { types, PromiEvent, Subscription } from "@ganache/utils";
import Blockchain from "./blockchain";
import { SerializedStartDealParams } from "./things/start-deal-params";
import { SerializedRootCID } from "./things/root-cid";
import { SerializedDealInfo } from "./things/deal-info";
import { SerializedTipset } from "./things/tipset";
import { SerializedAddress } from "./things/address";
import { SerializedRetrievalOrder } from "./things/retrieval-order";
import { SerializedQueryOffer } from "./things/query-offer";
import { SubscriptionMethod, SubscriptionId } from "./types/subscriptions";
import { SerializedFileRef } from "./things/file-ref";
import { SerializedMinerPower } from "./things/miner-power";
import { SerializedMinerInfo } from "./things/miner-info";
export default class FilecoinApi implements types.Api {
  #private;
  readonly [index: string]: (...args: any) => Promise<any>;
  constructor(blockchain: Blockchain);
  stop(): Promise<void>;
  "Filecoin.ChainGetGenesis"(): Promise<SerializedTipset>;
  "Filecoin.ChainHead"(): Promise<SerializedTipset>;
  "Filecoin.ChainNotify"(rpcId?: string): PromiEvent<Subscription>;
  [SubscriptionMethod.ChannelClosed](
    subscriptionId: SubscriptionId
  ): Promise<boolean>;
  "Filecoin.StateListMiners"(): Promise<Array<string>>;
  "Filecoin.StateMinerPower"(
    minerAddress: string
  ): Promise<SerializedMinerPower>;
  "Filecoin.StateMinerInfo"(minerAddress: string): Promise<SerializedMinerInfo>;
  "Filecoin.WalletDefaultAddress"(): Promise<SerializedAddress>;
  "Filecoin.WalletBalance"(address: string): Promise<string>;
  "Filecoin.ClientStartDeal"(
    serializedProposal: SerializedStartDealParams
  ): Promise<SerializedRootCID>;
  "Filecoin.ClientListDeals"(): Promise<Array<SerializedDealInfo>>;
  "Filecoin.ClientFindData"(
    rootCid: SerializedRootCID
  ): Promise<Array<SerializedQueryOffer>>;
  "Filecoin.ClientHasLocal"(rootCid: SerializedRootCID): Promise<boolean>;
  "Filecoin.ClientRetrieve"(
    retrievalOrder: SerializedRetrievalOrder,
    ref: SerializedFileRef
  ): Promise<object>;
  "Ganache.MineTipset"(): Promise<SerializedTipset>;
}
