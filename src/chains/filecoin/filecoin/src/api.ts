//#region Imports
import { types, Quantity, PromiEvent, Subscription } from "@ganache/utils";
import Blockchain from "./blockchain";
import {
  StartDealParams,
  SerializedStartDealParams
} from "./things/start-deal-params";
import { SerializedRootCID, RootCID } from "./things/root-cid";
import { DealInfo, SerializedDealInfo } from "./things/deal-info";
import { SerializedTipset, Tipset } from "./things/tipset";
import { Address, AddressProtocol, SerializedAddress } from "./things/address";
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
import { Account } from "./things/account";
import { Message, SerializedMessage } from "./things/message";
import {
  MessageSendSpec,
  SerializedMessageSendSpec
} from "./things/message-send-spec";
import {
  SerializedSignedMessage,
  SignedMessage
} from "./things/signed-message";
import { KeyType } from "./things/key-type";
import { KeyInfo, SerializedKeyInfo } from "./things/key-info";
import { SerializedSignature, Signature } from "./things/signature";
import { SigType } from "./things/sig-type";
import base32 from "base32-encoding";
import { SerializedBlockHeader } from "./things/block-header";
import { SerializedBlockMessages } from "./things/block-messages";

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
      blockDelay: BigInt(
        this.#blockchain.minerEnabled
          ? this.#blockchain.options.miner.blockTime
          : 0
      )
    }).serialize();
  }

  async "Filecoin.ChainGetGenesis"(): Promise<SerializedTipset> {
    const tipset = this.#blockchain.genesisTipset();
    return tipset.serialize();
  }

  async "Filecoin.ChainHead"(): Promise<SerializedTipset> {
    const tipset = this.#blockchain.latestTipset();
    return tipset.serialize();
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

  async "Filecoin.ChainGetTipSet"(
    serializedTipsetKey: Array<SerializedRootCID>
  ): Promise<SerializedTipset> {
    await this.#blockchain.waitForReady();

    const tipset = await this.#blockchain.getTipsetFromKey(
      serializedTipsetKey.map(serializedCid => new RootCID(serializedCid))
    );
    return tipset.serialize();
  }

  async "Filecoin.ChainGetTipSetByHeight"(
    height: number,
    serializedTipsetKey?: Array<SerializedRootCID>
  ): Promise<SerializedTipset> {
    await this.#blockchain.waitForReady();

    let tipset: Tipset;
    // we check if serializedTipsetKey is an array as well because
    // of our voodoo json rpc ID gets appended to the args
    if (serializedTipsetKey && Array.isArray(serializedTipsetKey)) {
      tipset = await this.#blockchain.getTipsetByHeight(
        height,
        serializedTipsetKey.map(serializedCid => new RootCID(serializedCid))
      );
    } else {
      tipset = await this.#blockchain.getTipsetByHeight(height);
    }

    return tipset.serialize();
  }

  async "Filecoin.ChainGetBlock"(
    serializedBlockCid: SerializedRootCID
  ): Promise<SerializedBlockHeader> {
    await this.#blockchain.waitForReady();

    const blockCid = new RootCID(serializedBlockCid);
    const blockHeader = await this.#blockchain.blockHeaderManager!.get(
      blockCid.root.value
    );

    if (!blockHeader) {
      throw new Error("Could not find a block for the provided CID");
    }

    return blockHeader.serialize();
  }

  async "Filecoin.ChainGetBlockMessages"(
    serializedBlockCid: SerializedRootCID
  ): Promise<SerializedBlockMessages> {
    await this.#blockchain.waitForReady();

    const blockCid = new RootCID(serializedBlockCid);
    const blockMessages = await this.#blockchain.blockMessagesManager!.getBlockMessages(
      blockCid.root
    );

    if (!blockMessages) {
      throw new Error("Could not find a block for the provided CID");
    }

    return blockMessages.serialize();
  }

  async "Filecoin.ChainGetMessage"(
    serializedMessageCid: SerializedRootCID
  ): Promise<SerializedMessage> {
    await this.#blockchain.waitForReady();

    const blockMessageCid = new RootCID(serializedMessageCid);
    const signedMessage = await this.#blockchain.signedMessagesManager!.get(
      blockMessageCid.root.value
    );

    if (!signedMessage) {
      throw new Error("Could not find a message for the provided CID");
    }

    return signedMessage.message.serialize();
  }

  async "Filecoin.MpoolGetNonce"(address: string): Promise<number> {
    await this.#blockchain.waitForReady();

    const account = await this.#blockchain.accountManager!.getAccount(address);
    const pendingMessagesForAccount = this.#blockchain.messagePool.filter(
      queuedMessage => queuedMessage.message.from === address
    );

    if (pendingMessagesForAccount.length === 0) {
      // account.nonce already stores the "next nonce"
      // don't add more to it
      return account.nonce;
    } else {
      // in this case, we have messages in the pool with
      // already incremented nonces (account.nonce only
      // increments when the block is mined). this will
      // generate a nonce greater than any other nonce
      const nonceFromPendingMessages = pendingMessagesForAccount.reduce(
        (nonce, m) => {
          return Math.max(nonce, m.message.nonce);
        },
        account.nonce
      );
      return nonceFromPendingMessages + 1;
    }
  }

  async "Filecoin.MpoolPush"(
    signedMessage: SerializedSignedMessage
  ): Promise<SerializedRootCID> {
    const rootCid = await this.#blockchain.pushSigned(
      new SignedMessage(signedMessage)
    );

    return rootCid.serialize();
  }

  // Reference implementation: https://git.io/JtgeG
  async "Filecoin.MpoolBatchPush"(
    signedMessages: Array<SerializedSignedMessage>
  ): Promise<Array<SerializedRootCID>> {
    const cids: RootCID[] = [];

    // The lotus code makes it seem like it tries to
    // still send a response with the signed messages that
    // succeeded if one of them fails (see line 195 in ref impl).
    // However, after trying it on lotus-devnet, I only receive the
    // error (if the second message is the one that errors).
    // So just letting the error bubble up should do the trick here.
    // The reference implementation also doesn't revert/clear the messages
    // that did successfully get added.
    for (const signedMessage of signedMessages) {
      const cid = await this.#blockchain.pushSigned(
        new SignedMessage(signedMessage)
      );
      cids.push(cid);
    }

    return cids.map(c => c.serialize());
  }

  async "Filecoin.MpoolPushMessage"(
    message: SerializedMessage,
    spec: SerializedMessageSendSpec
  ): Promise<SerializedSignedMessage> {
    const signedMessage = await this.#blockchain.push(
      new Message(message),
      new MessageSendSpec(spec)
    );

    return signedMessage.serialize();
  }

  // Reference implementation: https://git.io/JtgeU
  async "Filecoin.MpoolBatchPushMessage"(
    messages: Array<SerializedMessage>,
    spec: SerializedMessageSendSpec
  ): Promise<Array<SerializedSignedMessage>> {
    const signedMessages: SignedMessage[] = [];

    // The lotus code makes it seem like it tries to
    // still send a response with the signed messages that
    // succeeded if one of them fails (see line 219 in ref impl).
    // However, after trying it on lotus-devnet, I only receive the
    // error (if the second message is the one that errors).
    // So just letting the error bubble up should do the trick here.
    // The reference implementation also doesn't revert/clear the messages
    // that did successfully get added.
    for (const message of messages) {
      const signedMessage = await this.#blockchain.push(
        new Message(message),
        new MessageSendSpec(spec)
      );
      signedMessages.push(signedMessage);
    }

    return signedMessages.map(sm => sm.serialize());
  }

  async "Filecoin.MpoolClear"(local: boolean): Promise<void> {
    await this.#blockchain.mpoolClear(local);
  }

  // This function takes an argument of type TipsetKey,
  // but the Ganache design will never use it. See implementation
  // for more details
  async "Filecoin.MpoolPending"(): Promise<Array<SerializedSignedMessage>> {
    const signedMessages = await this.#blockchain.mpoolPending();

    return signedMessages.map(signedMessage => signedMessage.serialize());
  }

  // This function takes an argument of type TipsetKey and
  // a ticket quality argument. As you can see in the reference
  // implementation (https://git.io/Jt24C), these are used for
  // determining what messages are going to be included in the
  // next block. However, Ganache includes all messages in the
  // next block, and doesn't really have a decision algorithm.
  // Therefore, this is identical to MpoolPending
  async "Filecoin.MpoolSelect"(): Promise<Array<SerializedSignedMessage>> {
    const signedMessages = await this.#blockchain.mpoolPending();

    return signedMessages.map(signedMessage => signedMessage.serialize());
  }

  // This method is part of the StorageMiner API,
  // so it's supposed to return the actor address
  // for the mining side of things (since Ganache
  // represents multiple actors in this simulator)
  async "Filecoin.ActorAddress"(): Promise<string> {
    return this.#blockchain.miner.value;
  }

  async "Filecoin.StateListMiners"(): Promise<Array<string>> {
    return [this.#blockchain.miner.value];
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
    if (minerAddress === this.#blockchain.miner.value) {
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
    if (minerAddress === this.#blockchain.miner.value) {
      // The defaults are set up to correspond to the current
      // miner address t0100, which is not configurable currently
      return new MinerInfo().serialize();
    } else {
      throw new Error("Failed to load miner actor: actor not found");
    }
  }

  async "Filecoin.WalletDefaultAddress"(): Promise<SerializedAddress> {
    await this.#blockchain.waitForReady();
    const accounts = await this.#blockchain.accountManager!.getControllableAccounts();
    return accounts[0].address.serialize();
  }

  async "Filecoin.WalletSetDefault"(address: string): Promise<void> {
    await this.#blockchain.waitForReady();
    await this.#blockchain.privateKeyManager!.setDefault(address);
  }

  async "Filecoin.WalletBalance"(address: string): Promise<string> {
    await this.#blockchain.waitForReady();

    const account = await this.#blockchain.accountManager!.getAccount(address);
    return account.balance.serialize();
  }

  async "Filecoin.WalletNew"(keyType: KeyType): Promise<SerializedAddress> {
    let protocol: AddressProtocol;
    switch (keyType) {
      case KeyType.KeyTypeBLS: {
        protocol = AddressProtocol.BLS;
        break;
      }
      case KeyType.KeyTypeSecp256k1: {
        protocol = AddressProtocol.SECP256K1;
        break;
      }
      case KeyType.KeyTypeSecp256k1Ledger:
      default: {
        throw new Error(
          `KeyType of ${keyType} is not supported. Please use "bls" or "secp256k1".`
        );
      }
    }

    const account = await this.#blockchain.createAccount(protocol);
    return account.address.serialize();
  }

  async "Filecoin.WalletList"(): Promise<Array<SerializedAddress>> {
    await this.#blockchain.waitForReady();

    const accounts = await this.#blockchain.accountManager!.getControllableAccounts();
    return accounts.map(account => account.address.serialize());
  }

  async "Filecoin.WalletHas"(address: string): Promise<boolean> {
    await this.#blockchain.waitForReady();

    return await this.#blockchain.privateKeyManager!.hasPrivateKey(address);
  }

  async "Filecoin.WalletDelete"(address: string): Promise<void> {
    await this.#blockchain.waitForReady();

    await this.#blockchain.privateKeyManager!.deletePrivateKey(address);
  }

  async "Filecoin.WalletExport"(address: string): Promise<SerializedKeyInfo> {
    await this.#blockchain.waitForReady();

    const privateKey = await this.#blockchain.privateKeyManager!.getPrivateKey(
      address
    );
    if (privateKey === null) {
      throw new Error("key not found");
    }

    const protocol = Address.parseProtocol(address);

    const keyInfo = new KeyInfo({
      type:
        protocol === AddressProtocol.BLS
          ? KeyType.KeyTypeBLS
          : KeyType.KeyTypeSecp256k1,
      privateKey: Buffer.from(privateKey, "hex")
    });

    return keyInfo.serialize();
  }

  async "Filecoin.WalletImport"(
    serializedKeyInfo: SerializedKeyInfo
  ): Promise<SerializedAddress> {
    await this.#blockchain.waitForReady();

    const keyInfo = new KeyInfo(serializedKeyInfo);

    if (keyInfo.type === KeyType.KeyTypeSecp256k1Ledger) {
      throw new Error(
        "Ganache doesn't support ledger accounts; please use 'bls' or 'secp256k1' key types."
      );
    }

    const protocol =
      keyInfo.type === KeyType.KeyTypeBLS
        ? AddressProtocol.BLS
        : AddressProtocol.SECP256K1;

    const address = Address.fromPrivateKey(
      keyInfo.privateKey.toString("hex"),
      protocol
    );

    await this.#blockchain.privateKeyManager!.putPrivateKey(
      address.value,
      address.privateKey!
    );

    return address.serialize();
  }

  async "Filecoin.WalletSign"(
    address: string,
    data: string
  ): Promise<SerializedSignature> {
    await this.#blockchain.waitForReady();

    const account = await this.#blockchain.accountManager!.getAccount(address);

    const signedData = await account.address.signBuffer(
      Buffer.from(data, "base64")
    );

    const signature = new Signature({
      type:
        account.address.protocol === AddressProtocol.BLS
          ? SigType.SigTypeBLS
          : SigType.SigTypeSecp256k1,
      data: signedData
    });

    return signature.serialize();
  }

  async "Filecoin.WalletSignMessage"(
    address: string,
    serializedMessage: SerializedMessage
  ): Promise<SerializedSignedMessage> {
    await this.#blockchain.waitForReady();

    const account = await this.#blockchain.accountManager!.getAccount(address);

    const message = new Message(serializedMessage);
    const signedData = await account.address.signMessage(message);

    const signedMessage = new SignedMessage({
      message,
      signature: new Signature({
        type:
          account.address.protocol === AddressProtocol.BLS
            ? SigType.SigTypeBLS
            : SigType.SigTypeSecp256k1,
        data: signedData
      })
    });

    return signedMessage.serialize();
  }

  async "Filecoin.WalletVerify"(
    inputAddress: string,
    data: string,
    serializedSignature: SerializedSignature
  ): Promise<boolean> {
    await this.#blockchain.waitForReady();

    const signature = new Signature(serializedSignature);

    const protocol = Address.parseProtocol(inputAddress);
    const isBLS =
      protocol === AddressProtocol.BLS && signature.type === SigType.SigTypeBLS;
    const isSecp =
      protocol === AddressProtocol.SECP256K1 &&
      signature.type === SigType.SigTypeSecp256k1;
    const isValid = isBLS || isSecp;
    if (isValid) {
      const address = new Address(inputAddress);
      return await address.verifySignature(
        Buffer.from(data, "base64"),
        signature
      );
    } else {
      throw new Error(
        "Invalid address protocol with signature. Address protocol should match the corresponding signature Type. Only BLS or SECP256K1 are supported"
      );
    }
  }

  async "Filecoin.WalletValidateAddress"(
    inputAddress: string
  ): Promise<SerializedAddress> {
    await this.#blockchain.waitForReady();

    const address = Address.validate(inputAddress);

    return address.serialize();
  }

  async "Filecoin.ClientStartDeal"(
    serializedProposal: SerializedStartDealParams
  ): Promise<SerializedRootCID> {
    let proposal = new StartDealParams(serializedProposal);
    let proposalRootCid = await this.#blockchain.startDeal(proposal);

    return proposalRootCid.serialize();
  }

  async "Filecoin.ClientListDeals"(): Promise<Array<SerializedDealInfo>> {
    await this.#blockchain.waitForReady();

    const deals = await this.#blockchain.dealInfoManager!.getDeals();

    return deals.map(deal => deal.serialize());
  }

  // Reference implementation: https://git.io/JthfU
  async "Filecoin.ClientGetDealInfo"(
    serializedCid: SerializedRootCID
  ): Promise<SerializedDealInfo> {
    await this.#blockchain.waitForReady();

    const dealInfo = await this.#blockchain.dealInfoManager!.get(
      serializedCid["/"]
    );
    if (dealInfo) {
      // Verified that this is the correct lookup since dealsByCid
      // uses the ProposalCid (ref impl: https://git.io/Jthv7) and the
      // reference implementation of the lookup follows suit: https://git.io/Jthvp
      //
      return dealInfo.serialize();
    } else {
      throw new Error("Could not find a deal for the provided CID");
    }
  }

  "Filecoin.ClientGetDealUpdates"(rpcId?: string): PromiEvent<Subscription> {
    const subscriptionId = this.#getId();
    let promiEvent: PromiEvent<Subscription>;

    const unsubscribeFromEmittery = this.#blockchain.on(
      "dealUpdate",
      (deal: DealInfo) => {
        if (promiEvent) {
          promiEvent.emit("message", {
            type: SubscriptionMethod.ChannelUpdated,
            data: [subscriptionId.toString(), deal.serialize()]
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

    return promiEvent;
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
    const tipset = this.#blockchain.latestTipset();
    return tipset.serialize();
  }

  async "Ganache.EnableMiner"(): Promise<void> {
    this.#blockchain.enableMiner();
  }

  async "Ganache.DisableMiner"(): Promise<void> {
    this.#blockchain.disableMiner();
  }

  async "Ganache.MinerEnabled"(): Promise<boolean> {
    return this.#blockchain.minerEnabled;
  }

  "Ganache.MinerEnabledNotify"(rpcId?: string): PromiEvent<Subscription> {
    const subscriptionId = this.#getId();
    let promiEvent: PromiEvent<Subscription>;

    const unsubscribeFromEmittery = this.#blockchain.on(
      "minerEnabled",
      (minerEnabled: boolean) => {
        if (promiEvent) {
          promiEvent.emit("message", {
            type: SubscriptionMethod.ChannelUpdated,
            data: [subscriptionId.toString(), minerEnabled]
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
      data: [subscriptionId.toString(), this.#blockchain.minerEnabled]
    });

    return promiEvent;
  }

  async "Ganache.GetDealById"(dealId: number): Promise<SerializedDealInfo> {
    await this.#blockchain.waitForReady();

    const deal = await this.#blockchain.dealInfoManager!.getDealById(dealId);
    if (deal) {
      return deal.serialize();
    } else {
      throw new Error("Could not find a deal for the provided ID");
    }
  }
}
