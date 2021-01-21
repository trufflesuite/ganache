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

export default class FilecoinApi implements types.Api {
  readonly [index: string]: (...args: any) => Promise<any>;

  readonly #blockchain: Blockchain;

  constructor(blockchain: Blockchain) {
    this.#blockchain = blockchain;
  }

  async stop(): Promise<void> {
    return await this.#blockchain.stop();
  }

  async "Filecoin.ChainGetGenesis"(): Promise<SerializedTipset> {
    return this.#blockchain.latestTipset().serialize();
  }

  async "Filecoin.ChainHead"(): Promise<SerializedTipset> {
    return this.#blockchain.latestTipset().serialize();
  }

  async "Filecoin.StateListMiners"(): Promise<Array<SerializedMiner>> {
    return [this.#blockchain.miner.serialize()];
  }

  async "Filecoin.WalletDefaultAddress"(): Promise<SerializedAddress> {
    return this.#blockchain.address.serialize();
  }

  async "Filecoin.WalletBalance"(address: string): Promise<string> {
    let managedAddress = this.#blockchain.address;

    // For now, anything but our default address will have no balance
    if (managedAddress.value == address) {
      return this.#blockchain.balance.serialize();
    } else {
      return "0";
    }
  }

  async "Filecoin.ClientStartDeal"(
    serializedProposal: SerializedStorageProposal
  ): Promise<SerializedRootCID> {
    let proposal = new StorageProposal(serializedProposal);
    let proposalRootCid = await this.#blockchain.startDeal(proposal);

    return proposalRootCid.serialize();
  }

  async "Filecoin.ClientListDeals"(): Promise<Array<SerializedDeal>> {
    return this.#blockchain.deals.map(deal => deal.serialize());
  }

  async "Filecoin.ClientFindData"(
    rootCid: SerializedRootCID
  ): Promise<Array<SerializedRetrievalOffer>> {
    let remoteOffer = await this.#blockchain.createRetrievalOffer(
      new RootCID(rootCid)
    );
    return [remoteOffer.serialize()];
  }

  async "Filecoin.ClientHasLocal"(
    rootCid: SerializedRootCID
  ): Promise<boolean> {
    return await this.#blockchain.hasLocal(rootCid["/"]);
  }

  async "Filecoin.ClientRetrieve"(
    retrievalOffer: SerializedRetrievalOffer
  ): Promise<object> {
    await this.#blockchain.retrieve(new RetrievalOffer(retrievalOffer));

    // Return value is a placeholder.
    //
    // 1) JSON wants to parse the result, so this prevents it parsing `undefined`.
    // 2) This API is going to change very soon, according to Lotus devs.
    //
    // As of this writing, this API function is *supposed* to return nothing at all.
    return {};
  }

  async "Ganache.MineTipset"(): Promise<SerializedTipset> {
    await this.#blockchain.mineTipset();
    return this.#blockchain.latestTipset().serialize();
  }
}
