//#region Imports
import { types } from "@ganache/utils";
import Blockchain from "./blockchain";
import {
  StorageProposal,
  SerializedStorageProposal
} from "./things/storage-proposal";
import { SerializedRootCID, RootCID } from "./things/root-cid";
import { SerializedDeal } from "./things/deal";
import { SerializedTipset } from "./things/tipset";
import { SerializedAddress } from "./things/address";
import { SerializedMiner } from "./things/miner";
import {
  SerializedRetrievalOffer,
  RetrievalOffer
} from "./things/retrieval-offer";

const _blockchain = Symbol("blockchain");

export default class FilecoinApi implements types.Api {
  readonly [index: string]: (...args: any) => Promise<any>;

  private readonly [_blockchain]: Blockchain;

  constructor(blockchain: Blockchain) {
    this[_blockchain] = blockchain;
  }

  async stop(): Promise<void> {
    return await this[_blockchain].stop();
  }

  async "Filecoin.ChainGetGenesis"(): Promise<SerializedTipset> {
    return this[_blockchain].latestTipset().serialize();
  }

  async "Filecoin.ChainHead"(): Promise<SerializedTipset> {
    return this[_blockchain].latestTipset().serialize();
  }

  async "Filecoin.StateListMiners"(): Promise<Array<SerializedMiner>> {
    return [this[_blockchain].miner.serialize()];
  }

  async "Filecoin.WalletDefaultAddress"(): Promise<SerializedAddress> {
    return this[_blockchain].address.serialize();
  }

  async "Filecoin.WalletBalance"(address: string): Promise<string> {
    let managedAddress = this[_blockchain].address;

    // For now, anything but our default address will have no balance
    if (managedAddress.value == address) {
      return this[_blockchain].balance.serialize();
    } else {
      return "0";
    }
  }

  async "Filecoin.ClientStartDeal"(
    serializedProposal: SerializedStorageProposal
  ): Promise<SerializedRootCID> {
    let proposal = new StorageProposal(serializedProposal);
    let proposalRootCid = await this[_blockchain].startDeal(proposal);

    return proposalRootCid.serialize();
  }

  async "Filecoin.ClientListDeals"(): Promise<Array<SerializedDeal>> {
    return this[_blockchain].deals.map(deal => deal.serialize());
  }

  async "Filecoin.ClientFindData"(
    rootCid: SerializedRootCID
  ): Promise<Array<SerializedRetrievalOffer>> {
    let remoteOffer = await this[_blockchain].createRetrievalOffer(
      new RootCID(rootCid)
    );
    return [remoteOffer.serialize()];
  }

  async "Filecoin.ClientHasLocal"(
    rootCid: SerializedRootCID
  ): Promise<boolean> {
    return await this[_blockchain].hasLocal(rootCid["/"]);
  }

  async "Filecoin.ClientRetrieve"(
    retrievalOffer: SerializedRetrievalOffer
  ): Promise<object> {
    await this[_blockchain].retrieve(new RetrievalOffer(retrievalOffer));

    // Return value is a placeholder.
    //
    // 1) JSON wants to parse the result, so this prevents it parsing `undefined`.
    // 2) This API is going to change very soon, according to Lotus devs.
    //
    // As of this writing, this API function is *supposed* to return nothing at all.
    return {};
  }

  async "Filecoin.GanacheMineTipset"(): Promise<SerializedTipset> {
    await this[_blockchain].mineTipset();
    return this[_blockchain].latestTipset().serialize();
  }
}
