//#region Imports
import { types, Quantity, PromiEvent } from "@ganache/utils";
import Blockchain from "./blockchain";
import {
  StorageProposal,
  SerializedStorageProposal
} from "./things/storage-proposal";
import { SerializedRootCID, RootCID } from "./things/root-cid";
import { SerializedDeal } from "./things/deal";
import { SerializedTipset, Tipset } from "./things/tipset";
import { SerializedAddress } from "./things/address";
import { SerializedMiner } from "./things/miner";
import {
  SerializedRetrievalOffer,
  RetrievalOffer
} from "./things/retrieval-offer";
import Emittery from "emittery";
import { HeadChange, HeadChangeType } from "./things/head-change";

const _blockchain = Symbol("blockchain");

export default class FilecoinApi implements types.Api {
  readonly [index: string]: (...args: any) => Promise<any>;

  readonly #getId = (id => () => Quantity.from(++id))(0);
  readonly #subscriptions = new Map<string, Emittery.UnsubscribeFn>();
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

  "Filecoin.ChainNotify"(): PromiEvent<Quantity> {
    const subscription = this.#getId();
    const promiEvent = PromiEvent.resolve(subscription);

    // There currently isn't an unsubscribe method,
    // but it would go here
    this.#subscriptions.set(subscription.toString(), () => {});

    const currentHead = new HeadChange({
      type: HeadChangeType.HCCurrent,
      val: this[_blockchain].latestTipset()
    });

    this[_blockchain].on("tipset", (tipset: Tipset) => {
      const newHead = new HeadChange({
        type: HeadChangeType.HCApply,
        val: tipset
      });

      promiEvent.emit("message", {
        type: "xrpc.ch.val",
        data: [subscription.toString(), [newHead.serialize()]]
      });
    });

    promiEvent.emit("message", {
      type: "xrpc.ch.val",
      data: [subscription.toString(), [currentHead.serialize()]]
    });

    return promiEvent;
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
