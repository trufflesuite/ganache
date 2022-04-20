//#region Imports
import { Quantity, PromiEvent, Subscription, Api } from "@ganache/utils";
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
// same as SubscriptionMethod.ChannelClosed, but api-extractor doesn't like the
// enum so I just hardcoded it here
const ChannelClosed = "xrpc.ch.close" as const;
import { FileRef, SerializedFileRef } from "./things/file-ref";
import { MinerPower, SerializedMinerPower } from "./things/miner-power";
import { PowerClaim } from "./things/power-claim";
import { MinerInfo, SerializedMinerInfo } from "./things/miner-info";
import { SerializedVersion, Version } from "./things/version";
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
import { SerializedBlockHeader } from "./things/block-header";
import { SerializedBlockMessages } from "./things/block-messages";
import { StorageDealStatus } from "./types/storage-deal-status";

export default class FilecoinApi implements Api {
  readonly [index: string]: (...args: any) => Promise<any>;

  readonly #getId = (
    id => () =>
      Quantity.from(++id)
  )(0);
  readonly #subscriptions = new Map<string, Emittery.UnsubscribeFn>();
  readonly #blockchain: Blockchain;

  constructor(blockchain: Blockchain) {
    this.#blockchain = blockchain;
  }

  async initialize() {
    await this.#blockchain.initialize();
  }

  async stop(): Promise<void> {
    return await this.#blockchain.stop();
  }

  /**
   * Provides information about the provider.
   *
   * @returns A `Version` object with various version details
   * and the current block interval.
   */
  async "Filecoin.Version"(): Promise<SerializedVersion> {
    return new Version({
      blockDelay: BigInt(
        this.#blockchain.minerEnabled
          ? this.#blockchain.options.miner.blockTime
          : 0
      )
    }).serialize();
  }

  /**
   * Returns the libp2p Peer ID. Since Filecoin-flavored Ganache
   * does not connect to a network, it doesn't leverage libp2p.
   * This method instead returns a hardcoded Peer ID based on
   * the string "ganache".
   *
   * @returns `bafzkbzaced47iu7qygeshb3jamzkh2cqcmlxzcpxrnqsj6yoipuidor523jyg`
   */
  async "Filecoin.ID"(): Promise<string> {
    // This is calculated with the below code
    // Hardcoded as there's no reason to recalculate each time
    // mh = require("multihashing")(Buffer.from("ganache"), "blake2b-256");
    // (new require("peer-id")(mh)).toString()
    // Not sure what else to put here since we don't implement
    // the Filecoin P2P network
    return "bafzkbzaced47iu7qygeshb3jamzkh2cqcmlxzcpxrnqsj6yoipuidor523jyg";
  }

  /**
   * Returns the genesis tipset (tipset.Height = 0).
   *
   * @returns The genesis tipset.
   */
  async "Filecoin.ChainGetGenesis"(): Promise<SerializedTipset> {
    const tipset = this.#blockchain.genesisTipset();
    return tipset.serialize();
  }

  /**
   * Returns the head of the blockchain, which is the latest tipset.
   *
   * @returns The latest tipset.
   */
  async "Filecoin.ChainHead"(): Promise<SerializedTipset> {
    const tipset = this.#blockchain.latestTipset();
    return tipset.serialize();
  }

  /**
   * Starts a subscription to receive the latest tipset once
   * it has been mined.
   *
   * Reference implementation entry point: https://git.io/JtO3a
   *
   * @param rpcId - This parameter is not provided by the user, but
   * injected by the internal system.
   * @returns An object with the subscription ID and an unsubscribe
   * function.
   */
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

  /**
   * Receives the `xrpc.ch.close` method which cancels a
   * subscription.
   *
   * @param subscriptionId - The subscription ID to cancel.
   * @returns `false` if the subscription ID doesn't exist or
   * if the subscription is already canceled, `true` otherwise.
   */
  [ChannelClosed](subscriptionId: SubscriptionId): Promise<boolean> {
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

  /**
   * Returns the tipset for the provided tipset key.
   *
   * @param serializedTipsetKey - an array of the Block RootCIDs
   * that are part of the tipset. Must be an exact match and
   * must include exactly the same number of blocks that are
   * actually in the tipset.
   * @returns The matched tipset.
   */
  async "Filecoin.ChainGetTipSet"(
    serializedTipsetKey: Array<SerializedRootCID>
  ): Promise<SerializedTipset> {
    await this.#blockchain.waitForReady();

    const tipset = await this.#blockchain.getTipsetFromKey(
      serializedTipsetKey.map(serializedCid => new RootCID(serializedCid))
    );
    return tipset.serialize();
  }

  /**
   * Returns the tipset for the provided tipset height.
   *
   * @param height - A `number` which indicates the `tipset.Height`
   * that you would like to retrieve.
   * @param serializedTipsetKey - An optional tipset key, an array
   * of the Block RootCIDs that are part of the tipset. Must be
   * an exact match and must include exactly the same number of
   * blocks that are actually in the tipset.
   * @returns The matched tipset.
   */
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

  /**
   * Returns a block for the given RootCID.
   *
   * @param serializedBlockCid - The RootCID of the block.
   * @returns The matched Block.
   */
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

  /**
   * Returns the BlockMessages object, or all of the messages
   * that are part of a block, for a given block RootCID.
   *
   * @param serializedBlockCid - The RootCID of the block.
   * @returns The matched BlockMessages object.
   */
  async "Filecoin.ChainGetBlockMessages"(
    serializedBlockCid: SerializedRootCID
  ): Promise<SerializedBlockMessages> {
    await this.#blockchain.waitForReady();

    const blockCid = new RootCID(serializedBlockCid);
    const blockMessages =
      await this.#blockchain.blockMessagesManager!.getBlockMessages(
        blockCid.root
      );

    if (!blockMessages) {
      throw new Error("Could not find a block for the provided CID");
    }

    return blockMessages.serialize();
  }

  /**
   * Returns a Message for a given RootCID.
   *
   * @param serializedMessageCid - The RootCID of the message.
   * @returns The matched Message object.
   */
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

  /**
   * Gets the next nonce of an address, including any pending
   * messages in the current message pool.
   *
   * @param address - A `string` of the public address.
   * @returns A `number` of the next nonce.
   */
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

  /**
   * Submits a signed message to be added to the message
   * pool.
   *
   * Only value transfers are supported (`Method = 0`).
   *
   * @param signedMessage - The SignedMessage object.
   * @returns The RootCID of the signed message.
   */
  async "Filecoin.MpoolPush"(
    signedMessage: SerializedSignedMessage
  ): Promise<SerializedRootCID> {
    const rootCid = await this.#blockchain.pushSigned(
      new SignedMessage(signedMessage)
    );

    return rootCid.serialize();
  }

  /**
   * Submits an array of signed messages to be added to
   * the message pool.
   *
   * Messages are processed in index order of the array;
   * if any of them are invalid for any reason, the valid
   * messages up to that point are still added to the message
   * pool. The invalid message, as well as following messages
   * in the array, will not be processed or added to the
   * message pool.
   *
   * Only value transfers are supported (`Method = 0`).
   *
   * Reference implementation: https://git.io/JtgeG
   *
   * @param signedMessages - The array of SignedMessage objects.
   * @returns An array of RootCIDs for signed messages that
   * were valid and added to the message pool. The order of the
   * output array matches the order of the input array.
   */
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

  /**
   * Submits an unsigned message to be added to the message
   * pool.
   *
   * The `From` address must be one of the addresses held
   * in the wallet; see `Filecoin.WalletList` to retrieve
   * a list of addresses currently in the wallet. The `Nonce`
   * must be `0` and is filled in with the correct value in
   * the response object. Gas-related parameters will be
   * generated if not filled.
   *
   * Only value transfers are supported (`Method = 0`).
   *
   * @param message - The Message object.
   * @param spec - The MessageSendSpec object which defines
   * the MaxFee.
   * @returns The corresponding SignedMessage that was added
   * to the message pool.
   */
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

  /**
   * Submits an array of unsigned messages to be added to
   * the message pool.
   *
   * Messages are processed in index order of the array;
   * if any of them are invalid for any reason, the valid
   * messages up to that point are still added to the message
   * pool. The invalid message, as well as following messages
   * in the array, will not be processed or added to the
   * message pool.
   *
   * The `From` address must be one of the addresses
   * held in the wallet; see `Filecoin.WalletList` to retrieve
   * a list of addresses currently in the wallet. The `Nonce`
   * must be `0` and is filled in with the correct value in
   * the response object. Gas-related parameters will be
   * generated if not filled.
   *
   * Only value transfers are supported (`Method = 0`).
   *
   * Reference implementation: https://git.io/JtgeU
   *
   * @param messages - The array of Message objects.
   * @param spec - The MessageSendSpec object which defines
   * the MaxFee.
   * @returns An array of SignedMessages that were valid and
   * added to the message pool. The order of the output array
   * matches the order of the input array.
   */
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

  /**
   * Clears the current pending message pool; any messages in
   * the pool will not be processed in the next tipset/block
   * mine.
   *
   * @param local - In a normal Lotus node, setting this to `true`
   * will only clear local messages from the message pool. Since
   * Filecoin-flavored Ganache doesn't have a network, all messages
   * are local, and therefore all messages from the message pool
   * will be removed regardless of the value of this flag.
   */
  async "Filecoin.MpoolClear"(local: boolean): Promise<void> {
    await this.#blockchain.mpoolClear(local);
  }

  /**
   * Returns a list of messages in the current pending message
   * pool.
   *
   * @param tipsetKey - A normal Lotus node accepts an optional single
   * parameter of the TipsetKey to refer to the pending messages.
   * However, with the design of Filecoin-flavored Ganache, this
   * parameter is not used.
   * @returns An array of SignedMessage objects that are in the message pool.
   */
  async "Filecoin.MpoolPending"(
    tipsetKey: Array<RootCID>
  ): Promise<Array<SerializedSignedMessage>> {
    const signedMessages = await this.#blockchain.mpoolPending();

    return signedMessages.map(signedMessage => signedMessage.serialize());
  }

  /**
   * Returns a list of pending messages for inclusion in the next block.
   * Since all messages in the message pool are included in the next
   * block for Filecoin-flavored Ganache, this method returns the same
   * result as `Filecoin.MpoolPending`.
   *
   * Reference implementation: https://git.io/Jt24C
   *
   * @param tipsetKey - A normal Lotus node accepts an optional
   * parameter of the TipsetKey to refer to the pending messages.
   * However, with the design of Filecoin-flavored Ganache, this
   * parameter is not used in Ganache.
   * @param ticketQuality - Since all messages are included in the next
   * block in Ganache, this number is ignored. A normal Lotus node uses
   * this number to help determine which messages are going to be included
   * in the next block. This parameter is also not used in Ganache.
   *
   * @returns
   */
  async "Filecoin.MpoolSelect"(
    tipsetKey: Array<RootCID>,
    ticketQuality: number
  ): Promise<Array<SerializedSignedMessage>> {
    const signedMessages = await this.#blockchain.mpoolPending();

    return signedMessages.map(signedMessage => signedMessage.serialize());
  }

  /**
   * Returns the miner actor address for the Filecoin-flavored
   * Ganache node. This value is always the same and doesn't change.
   *
   * @returns `t01000`
   */
  async "Filecoin.ActorAddress"(): Promise<string> {
    return this.#blockchain.miner.value;
  }

  /**
   * Returns a list of the miner addresses for the
   * Filecoin-flavored Ganache. Ganache always has
   * the same single miner.
   *
   * @returns `[ "t01000" ]`
   */
  async "Filecoin.StateListMiners"(): Promise<Array<string>> {
    return [this.#blockchain.miner.value];
  }

  /**
   * Returns the miner power of a given miner address.
   *
   * "A storage miner's storage power is a value roughly proportional
   * to the amount of storage capacity they make available on behalf
   * of the network via capacity commitments or storage deals."
   * From: https://docs.filecoin.io/reference/glossary/#storage-power
   *
   * Since Ganache is currently only supporting 1 miner per Ganache
   * instance, then it will have a raw byte power of 1n and everything else will
   * have 0n. This indicates the supported miner contains all of the storage
   * power for the entire network (which is true). Any number would do, so we'll
   * stick with 1n.
   *
   * Quality adjusted power will be 0n always as relative
   * power doesn't change:
   * "The storage power a storage miner earns from a storage deal offered by a
   * verified client will be augmented by a multiplier."
   * https://docs.filecoin.io/reference/glossary/#quality-adjusted-storage-power
   *
   * @param minerAddress - The miner address to get miner power for.
   * @returns The MinerPower object.
   */
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

  /**
   * Returns the miner info for the given miner address.
   *
   * @param minerAddress -
   * @param tipsetKey - A normal Lotus node uses tipsetKey to get the
   * miner info at that Tipset. However, the miner info in
   * Filecoin-flavored Ganache will not change based on the tipset,
   * so this parameter is ignored by Ganache.
   * @returns The MinerInfo object.
   */
  async "Filecoin.StateMinerInfo"(
    minerAddress: string,
    tipsetKey: Array<RootCID>
  ): Promise<SerializedMinerInfo> {
    if (minerAddress === this.#blockchain.miner.value) {
      // The defaults are set up to correspond to the current
      // miner address t0100, which is not configurable currently
      return new MinerInfo().serialize();
    } else {
      throw new Error("Failed to load miner actor: actor not found");
    }
  }

  /**
   * Returns the default address of the wallet; this is also the first address
   * that is returned in `Filecoin.WalletList`.
   *
   * @returns A `string` of the public address.
   */
  async "Filecoin.WalletDefaultAddress"(): Promise<SerializedAddress> {
    await this.#blockchain.waitForReady();
    const accounts =
      await this.#blockchain.accountManager!.getControllableAccounts();
    return accounts[0].address.serialize();
  }

  /**
   * Sets the default address to the provided address. This will move the
   * address from its current position in the `Filecoin.WalletList` response
   * to the front of the array. This change is persisted across Ganache sessions
   * if you are using a persisted database with `database.db` or
   * `database.dbPath` options.
   *
   * @param address - The public address to set as the default address. Must be an address
   * that is in the wallet; see `Filecoin.WalletList` to get a list of addresses
   * in the wallet.
   */
  async "Filecoin.WalletSetDefault"(address: string): Promise<void> {
    await this.#blockchain.waitForReady();
    await this.#blockchain.privateKeyManager!.setDefault(address);
  }

  /**
   * Returns the balance of any address.
   *
   * @param address - The public address to retrieve the balance for.
   * @returns A `string` of the `attoFIL` balance of `address`,
   * encoded in base-10 (aka decimal format).
   */
  async "Filecoin.WalletBalance"(address: string): Promise<string> {
    await this.#blockchain.waitForReady();

    const account = await this.#blockchain.accountManager!.getAccount(address);
    return account.balance.serialize();
  }

  /**
   * Generate a new random address to add to the wallet. This new
   * address is persisted across Ganache sessions if you are using
   * a persisted database with `database.db` or `database.dbPath` options.
   *
   * @param keyType - The key type (`bls` or `secp256k1`) to use
   * to generate the address. KeyType of `secp256k1-ledger` is
   * not supported in Filecoin-flavored Ganache.
   * @returns The public address as a `string`.
   */
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

  /**
   * Returns the list of addresses in the wallet. The wallet stores the private
   * key of these addresses and therefore can sign messages and random bytes.
   *
   * @returns An array of `string`'s of each public address in the wallet.
   */
  async "Filecoin.WalletList"(): Promise<Array<SerializedAddress>> {
    await this.#blockchain.waitForReady();

    const accounts =
      await this.#blockchain.accountManager!.getControllableAccounts();
    return accounts.map(account => account.address.serialize());
  }

  /**
   * Checks whether or not the wallet includes the provided address.
   *
   * @param address - The public address of type `string` to check.
   * @returns `true` if the address is in the wallet, `false` otherwise.
   */
  async "Filecoin.WalletHas"(address: string): Promise<boolean> {
    await this.#blockchain.waitForReady();

    return await this.#blockchain.privateKeyManager!.hasPrivateKey(address);
  }

  /**
   * Removes the address from the wallet. This method is unrecoverable.
   * If you want to recover the address removed from this method, you
   * must use `Filecoin.WalletImport` with the correct private key.
   * Removing addresses from the wallet will persist between Ganache
   * sessions if you are using a persisted database with
   * `database.db` or `database.dbPath` options.
   *
   * @param address - A `string` of the public address to remove.
   */
  async "Filecoin.WalletDelete"(address: string): Promise<void> {
    await this.#blockchain.waitForReady();

    await this.#blockchain.privateKeyManager!.deletePrivateKey(address);
  }

  /**
   * Exports the private key information from an address stored in the wallet.
   *
   * @param address - A `string` of the public address to export.
   * @returns The KeyInfo object.
   */
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

  /**
   * Imports an address into the wallet with provided private key info.
   * Use this method to add more addresses to the wallet. Adding addresses
   * to the wallet will persist between Ganache sessions if you are using
   * a persisted database with with `database.db` or `database.dbPath` options.
   *
   * @param serializedKeyInfo - The private key KeyInfo object for the address to import.
   * @returns The corresponding public address of type `string`.
   */
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

  /**
   * Signs an arbitrary byte string using the private key info
   * stored in the wallet.
   *
   * @param address - A `string` of the public address in the wallet to
   * sign with.
   * @param data - A `string` of a base-64 encoded byte array to sign.
   * @returns A Signature object which contains the signature details.
   */
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

  /**
   * Signs a Message using the private key info stored in the wallet.
   *
   * @param address - A `string` of the public address in the wallet to
   * sign with.
   * @param serializedMessage - A Message object that needs signing.
   * @returns The corresponding SignedMessage object.
   */
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

  /**
   * Verifies the validity of a signature for a given address
   * and unsigned byte string.
   *
   * @param inputAddress - A `string` of the public address that
   * supposedly signed `data` with `serializedSignature`
   * @param data - A `string` of the data that was signed, encoded
   * in base-64.
   * @param serializedSignature - A Signature object of the signature
   * you're trying to verify.
   * @returns `true` if valid, `false` otherwise.
   */
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

  /**
   * Checks the validity of a given public address.
   *
   * @param inputAddress - The `string` of the public address to check.
   * @returns If successful, it returns the address back as a `string`.
   * Otherwise returns an error.
   */
  async "Filecoin.WalletValidateAddress"(
    inputAddress: string
  ): Promise<SerializedAddress> {
    await this.#blockchain.waitForReady();

    const address = Address.validate(inputAddress);

    return address.serialize();
  }

  /**
   * Start a storage deal. The data must already be uploaded to
   * the Ganache IPFS node. Deals are automatically accepted
   * as long as the public address in `Wallet` is in Ganache's
   * wallet (see `Filecoin.WalletList` or `Filecoin.WalletHas`
   * to check). Storage deals in Ganache automatically progress
   * each tipset from one state to the next towards the
   * StorageDealStatusActive state.
   *
   * @param serializedProposal - A StartDealParams object of the deal details.
   * @returns The RootCID of the new `DealInfo` =\> `DealInfo.ProposalCid`
   */
  async "Filecoin.ClientStartDeal"(
    serializedProposal: SerializedStartDealParams
  ): Promise<SerializedRootCID> {
    const proposal = new StartDealParams(serializedProposal);
    const proposalRootCid = await this.#blockchain.startDeal(proposal);

    return proposalRootCid.serialize();
  }

  /**
   * List all storage deals regardless of state, including expired deals.
   *
   * @returns An array of DealInfo objects.
   */
  async "Filecoin.ClientListDeals"(): Promise<Array<SerializedDealInfo>> {
    await this.#blockchain.waitForReady();

    const deals = await this.#blockchain.dealInfoManager!.getDeals();

    return deals.map(deal => deal.serialize());
  }

  /**
   * Get the detailed info of a storage deal.
   *
   * Reference implementation: https://git.io/JthfU
   *
   * @param serializedCid - The `DealInfo.ProposalCid` RootCID for the
   * deal you're searching for
   * @returns A DealInfo object.
   */
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

  /**
   * Get the corresponding string that represents a StorageDealStatus
   * code.
   *
   * Reference implementation: https://git.io/JqUXg
   *
   * @param statusCode - A `number` that's stored in `DealInfo.State`
   * which represents the current state of a storage deal.
   * @returns A `string` representation of the provided `statusCode`.
   */
  async "Filecoin.ClientGetDealStatus"(statusCode: number): Promise<string> {
    const status = StorageDealStatus[statusCode];
    if (!status) {
      throw new Error(`no such deal state ${statusCode}`);
    }
    return `StorageDeal${status}`;
  }

  /**
   * Starts a subscription to receive updates when storage deals
   * change state.
   *
   * @param rpcId - This parameter is not provided by the user, but
   * injected by the internal system.
   * @returns An object with the subscription ID and an unsubscribe
   * function.
   */
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

  /**
   * Ask the node to search for data stored in the IPFS node.
   *
   * @param rootCid - The RootCID to search for.
   * @returns A QueryOffer with details of the data for further
   * retrieval.
   */
  async "Filecoin.ClientFindData"(
    rootCid: SerializedRootCID
  ): Promise<Array<SerializedQueryOffer>> {
    const remoteOffer = await this.#blockchain.createQueryOffer(
      new RootCID(rootCid)
    );
    return [remoteOffer.serialize()];
  }

  /**
   * Returns whether or not the local IPFS node has the data
   * requested. Since Filecoin-flavored Ganache doesn't connect
   * to any external networks, all data on the IPFS node is local.
   *
   * @param rootCid - The RootCID to serach for.
   * @returns `true` if the local IPFS node has the data,
   * `false` otherwise.
   */
  async "Filecoin.ClientHasLocal"(
    rootCid: SerializedRootCID
  ): Promise<boolean> {
    return await this.#blockchain.hasLocal(rootCid["/"]);
  }

  /**
   * Download the contents of a storage deal to disk (local
   * to Ganache).
   *
   * @param retrievalOrder - A RetrievalOrder object detailing
   * the deal, retrieval price, etc.
   * @param ref - A FileRef object specifying where the file
   * should be saved to.
   */
  async "Filecoin.ClientRetrieve"(
    retrievalOrder: SerializedRetrievalOrder,
    ref: SerializedFileRef
  ): Promise<void> {
    await this.#blockchain.retrieve(
      new RetrievalOrder(retrievalOrder),
      new FileRef(ref)
    );
  }

  /**
   * Manually mine a tipset immediately. Mines even if the
   * miner is disabled.
   *
   * @returns The Tipset object that was mined.
   */
  async "Ganache.MineTipset"(): Promise<SerializedTipset> {
    await this.#blockchain.mineTipset();
    const tipset = this.#blockchain.latestTipset();
    return tipset.serialize();
  }

  /**
   * Enables the miner.
   */
  async "Ganache.EnableMiner"(): Promise<void> {
    await this.#blockchain.enableMiner();
  }

  /**
   * Disables the miner.
   */
  async "Ganache.DisableMiner"(): Promise<void> {
    await this.#blockchain.disableMiner();
  }

  /**
   * The current status on whether or not the miner
   * is enabled. The initial value is determined by
   * the option `miner.mine`. If `true`, then auto-mining
   * (`miner.blockTime = 0`) and interval mining
   * (`miner.blockTime > 0`) will be processed.
   * If `false`, tipsets/blocks will only be mined with
   * `Ganache.MineTipset`
   *
   * @returns A `boolean` on whether or not the miner is
   * enabled.
   */
  async "Ganache.MinerEnabled"(): Promise<boolean> {
    return this.#blockchain.minerEnabled;
  }

  /**
   * A subscription method that provides an update
   * whenever the miner is enabled or disabled.
   *
   * @param rpcId - This parameter is not provided by the user, but
   * injected by the internal system.
   * @returns An object with the subscription ID and an unsubscribe
   * function.
   */
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

  /**
   * Retrieves an internal `DealInfo` by its `DealID`.
   *
   * @param dealId - A `number` corresponding to the `DealInfo.DealID`
   * for the deal to retrieve.
   * @returns The matched DealInfo object.
   */
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
