import { types } from "@ganache/utils";
import Blockchain from "./blockchain";
import { SerializedStorageProposal } from "./things/storage-proposal";
import { SerializedRootCID } from "./things/root-cid";
import { SerializedDeal } from "./things/deal";
import { SerializedTipset } from "./things/tipset";
import { SerializedAddress } from "./things/address";
import { SerializedMiner } from "./things/miner";
import { SerializedRetrievalOffer } from "./things/retrieval-offer";
export default class FilecoinApi implements types.Api {
  #private;
  readonly [index: string]: (...args: any) => Promise<any>;
  constructor(blockchain: Blockchain);
  stop(): Promise<void>;
  "Filecoin.ChainGetGenesis"(): Promise<SerializedTipset>;
  "Filecoin.ChainHead"(): Promise<SerializedTipset>;
  "Filecoin.StateListMiners"(): Promise<Array<SerializedMiner>>;
  "Filecoin.WalletDefaultAddress"(): Promise<SerializedAddress>;
  "Filecoin.WalletBalance"(address: string): Promise<string>;
  "Filecoin.ClientStartDeal"(
    serializedProposal: SerializedStorageProposal
  ): Promise<SerializedRootCID>;
  "Filecoin.ClientListDeals"(): Promise<Array<SerializedDeal>>;
  "Filecoin.ClientFindData"(
    rootCid: SerializedRootCID
  ): Promise<Array<SerializedRetrievalOffer>>;
  "Filecoin.ClientHasLocal"(rootCid: SerializedRootCID): Promise<boolean>;
  "Filecoin.ClientRetrieve"(
    retrievalOffer: SerializedRetrievalOffer
  ): Promise<object>;
  "Ganache.MineTipset"(): Promise<SerializedTipset>;
}
