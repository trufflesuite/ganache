//#region Imports
import { types, Quantity, PromiEvent, Subscription } from "@ganache/utils";
import Blockchain from "./blockchain";
import {
  StartDealParams,
  SerializedStartDealParams
} from "./things/start-deal-params";
import { SerializedRootCID, RootCID } from "./things/root-cid";
import { SerializedDealInfo } from "./things/deal-info";
import { SerializedTipset, Tipset } from "./things/tipset";
import { SerializedAddress } from "./things/address";
import {
  SerializedRetrievalOrder,
  RetrievalOrder
} from "./things/retrieval-order";
import { SerializedQueryOffer } from "./things/query-offer";
import Emittery from "emittery";
import { HeadChange, HeadChangeType } from "./things/head-change";
import { SubscriptionMethod, SubscriptionId } from "./types/subscriptions";
import { FileRef, SerializedFileRef } from "./things/file-ref";
import { MinerPower, SerializedMinerPower } from "./things/miner-power";
import { PowerClaim } from "./things/power-claim";
import { MinerInfo, SerializedMinerInfo } from "./things/miner-info";
import { SerializedVersion, Version } from "./things/version";

export default class FilecoinApi implements types.Api {
  readonly [index: string]: (...args: any) => Promise<any>;

  readonly #getId = (id => () => Quantity.from(++id))(0);
  readonly #subscriptions = new Map<string, Emittery.UnsubscribeFn>();
  readonly #blockchain: Blockchain;

  constructor(blockchain: Blockchain) {
    this.#blockchain = blockchain;
  }

  async stop(): Promise<void> {
    return await this.#blockchain.stop();
  }

  async "Filecoin.Version"(): Promise<SerializedVersion> {
    return new Version({
      blockDelay: BigInt(this.#blockchain.options.miner.blockTime)
    }).serialize();
  }

  async "Filecoin.ChainGetGenesis"(): Promise<SerializedTipset> {
    return this.#blockchain.latestTipset().serialize();
  }

  async "Filecoin.ChainHead"(): Promise<SerializedTipset> {
    return this.#blockchain.latestTipset().serialize();
  }

  // Reference implementation entry point: https://git.io/JtO3a
  "Filecoin.ChainNotify"(rpcId?: string): PromiEvent<Subscription> {
    const subscriptionId = this.#getId();
    let promiEvent: PromiEvent<Subscription>;

    const currentHead = new HeadChange({
      type: HeadChangeType.HCCurrent,
      val: this.#blockchain.latestTipset()
    });

    const unsubscribeFromEmittery = this.#blockchain.on(
      "tipset",
      (tipset: Tipset) => {
        // Ganache currently doesn't support Filecoin reorgs,
        // so we'll always only have one tipset per head change
        // See reference implementations here: https://git.io/JtOOk;
        // other lines of interest are line 207 which shows only the chainstore only
        // references the "hcnf" (head change notification function) in the
        // reorgWorker function (lines 485-560)

        // Ganache currently doesn't support Filecoin reverts,
        // so we'll always use HCApply for now

        const newHead = new HeadChange({
          type: HeadChangeType.HCApply,
          val: tipset
        });

        if (promiEvent) {
          promiEvent.emit("message", {
            type: SubscriptionMethod.ChannelUpdated,
            data: [subscriptionId.toString(), [newHead.serialize()]]
          });
        }
      }
    );

    const unsubscribe = (): void => {
      unsubscribeFromEmittery();
      // Per https://git.io/JtOc1 and https://git.io/JtO3H
      // implementations, we're should cancel the subscription
      // since the protocol technically supports multiple channels
      // per subscription, but implementation seems to show that there's
      // only one channel per subscription
      if (rpcId) {
        promiEvent.emit("message", {
          type: SubscriptionMethod.SubscriptionCanceled,
          data: [rpcId]
        });
      }
    };

    promiEvent = PromiEvent.resolve({
      unsubscribe,
      id: subscriptionId
    });

    // There currently isn't an unsubscribe method,
    // but it would go here
    this.#subscriptions.set(subscriptionId.toString()!, unsubscribe);

    promiEvent.emit("message", {
      type: SubscriptionMethod.ChannelUpdated,
      data: [subscriptionId.toString(), [currentHead.serialize()]]
    });

    return promiEvent;
  }

  [SubscriptionMethod.ChannelClosed](
    subscriptionId: SubscriptionId
  ): Promise<boolean> {
    const subscriptions = this.#subscriptions;
    const unsubscribe = this.#subscriptions.get(subscriptionId);

    if (unsubscribe) {
      subscriptions.delete(subscriptionId);
      unsubscribe();
      return Promise.resolve(true);
    } else {
      return Promise.resolve(false);
    }
  }

  // This method is part of the StorageMiner API,
  // so it's supposed to return the actor address
  // for the mining side of things (since Ganache
  // represents multiple actors in this simulator)
  async "Filecoin.ActorAddress"(): Promise<string> {
    return this.#blockchain.miner;
  }

  async "Filecoin.StateListMiners"(): Promise<Array<string>> {
    return [this.#blockchain.miner];
  }

  // "A storage miner's storage power is a value roughly proportional
  // to the amount of storage capacity they make available on behalf
  // of the network via capacity commitments or storage deals."
  // https://docs.filecoin.io/reference/glossary/#storage-power
  // Since Ganache is currently only supporting 1 miner per Ganache
  // instance, then it will have a raw byte power of 1n and everything else will
  // have 0n. This indicates the supported miner contains all of the storage
  // power for the entire network (which is true). Any number would do, so we'll
  // stick with 1n. However quality adjusted power will be 0n always as relative
  // power doesn't change:
  // "The storage power a storage miner earns from a storage deal offered by a
  // verified client will be augmented by a multiplier."
  // https://docs.filecoin.io/reference/glossary/#quality-adjusted-storage-power
  async "Filecoin.StateMinerPower"(
    minerAddress: string
  ): Promise<SerializedMinerPower> {
    if (minerAddress === this.#blockchain.miner) {
      const power = new MinerPower({
        minerPower: new PowerClaim({
          rawBytePower: 1n,
          qualityAdjPower: 0n
        }),
        totalPower: new PowerClaim({
          rawBytePower: 1n,
          qualityAdjPower: 0n
        }),
        hasMinPower: false
      });

      return power.serialize();
    } else {
      const power = new MinerPower({
        minerPower: new PowerClaim({
          rawBytePower: 0n,
          qualityAdjPower: 0n
        }),
        totalPower: new PowerClaim({
          rawBytePower: 0n,
          qualityAdjPower: 0n
        }),
        hasMinPower: false
      });

      return power.serialize();
    }
  }

  // This function technically takes an additional TipSetKey
  // argument, but since the miner info won't change in Ganache,
  // it will go unused, and therefore not provided.
  async "Filecoin.StateMinerInfo"(
    minerAddress: string
  ): Promise<SerializedMinerInfo> {
    if (minerAddress === this.#blockchain.miner) {
      // The defaults are set up to correspond to the current
      // miner address t01000, which is not configurable currently
      return new MinerInfo().serialize();
    } else {
      throw new Error("Failed to load miner actor: actor not found");
    }
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
    serializedProposal: SerializedStartDealParams
  ): Promise<SerializedRootCID> {
    let proposal = new StartDealParams(serializedProposal);
    let proposalRootCid = await this.#blockchain.startDeal(proposal);

    return proposalRootCid.serialize();
  }

  async "Filecoin.ClientListDeals"(): Promise<Array<SerializedDealInfo>> {
    return this.#blockchain.deals.map(deal => deal.serialize());
  }

  async "Filecoin.ClientFindData"(
    rootCid: SerializedRootCID
  ): Promise<Array<SerializedQueryOffer>> {
    let remoteOffer = await this.#blockchain.createQueryOffer(
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
    retrievalOrder: SerializedRetrievalOrder,
    ref: SerializedFileRef
  ): Promise<object> {
    await this.#blockchain.retrieve(
      new RetrievalOrder(retrievalOrder),
      new FileRef(ref)
    );

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
