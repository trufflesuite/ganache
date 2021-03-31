import { types, PromiEvent, Subscription } from "@ganache/utils";
import Blockchain from "./blockchain";
import { SerializedStartDealParams } from "./things/start-deal-params";
import { SerializedRootCID, RootCID } from "./things/root-cid";
import { SerializedDealInfo } from "./things/deal-info";
import { SerializedTipset } from "./things/tipset";
import { SerializedAddress } from "./things/address";
import { SerializedRetrievalOrder } from "./things/retrieval-order";
import { SerializedQueryOffer } from "./things/query-offer";
import { SubscriptionMethod, SubscriptionId } from "./types/subscriptions";
import { SerializedFileRef } from "./things/file-ref";
import { SerializedMinerPower } from "./things/miner-power";
import { SerializedMinerInfo } from "./things/miner-info";
import { SerializedVersion } from "./things/version";
import { SerializedMessage } from "./things/message";
import { SerializedMessageSendSpec } from "./things/message-send-spec";
import { SerializedSignedMessage } from "./things/signed-message";
import { KeyType } from "./things/key-type";
import { SerializedKeyInfo } from "./things/key-info";
import { SerializedSignature } from "./things/signature";
import { SerializedBlockHeader } from "./things/block-header";
import { SerializedBlockMessages } from "./things/block-messages";
export default class FilecoinApi implements types.Api {
  #private;
  readonly [index: string]: (...args: any) => Promise<any>;
  constructor(blockchain: Blockchain);
  initialize(): Promise<void>;
  stop(): Promise<void>;
  /**
   * Provides information about the provider.
   *
   * @returns A `Version` object with various version details
   * and the current block interval.
   */
  "Filecoin.Version"(): Promise<SerializedVersion>;
  /**
   * Returns the libp2p Peer ID. Since Filecoin-flavored Ganache
   * does not connect to a network, it doesn't leverage libp2p.
   * This method instead returns a hardcoded Peer ID based on
   * the string "ganache".
   *
   * @returns `bafzkbzaced47iu7qygeshb3jamzkh2cqcmlxzcpxrnqsj6yoipuidor523jyg`
   */
  "Filecoin.ID"(): Promise<string>;
  /**
   * Returns the genesis tipset (tipset.Height = 0).
   *
   * @returns The genesis tipset.
   */
  "Filecoin.ChainGetGenesis"(): Promise<SerializedTipset>;
  /**
   * Returns the head of the blockchain, which is the latest tipset.
   *
   * @returns The latest tipset.
   */
  "Filecoin.ChainHead"(): Promise<SerializedTipset>;
  /**
   * Starts a subscription to receive the latest tipset once
   * it has been mined.
   *
   * Reference implementation entry point: https://git.io/JtO3a
   *
   * @param rpcId This parameter is not provided by the user, but
   * injected by the internal system.
   * @returns An object with the subscription ID and an unsubscribe
   * function.
   */
  "Filecoin.ChainNotify"(rpcId?: string): PromiEvent<Subscription>;
  /**
   * Receives the `xrpc.ch.close` method which cancels a
   * subscription.
   *
   * @param subscriptionId The subscription ID to cancel.
   * @returns `false` if the subscription ID doesn't exist or
   * if the subscription is already canceled, `true` otherwise.
   */
  [SubscriptionMethod.ChannelClosed](
    subscriptionId: SubscriptionId
  ): Promise<boolean>;
  /**
   * Returns the tipset for the provided tipset key.
   *
   * @param serializedTipsetKey an array of the Block RootCIDs
   * that are part of the tipset. Must be an exact match and
   * must include exactly the same number of blocks that are
   * actually in the tipset.
   * @returns The matched tipset.
   */
  "Filecoin.ChainGetTipSet"(
    serializedTipsetKey: Array<SerializedRootCID>
  ): Promise<SerializedTipset>;
  /**
   * Returns the tipset for the provided tipset height.
   *
   * @param height A `number` which indicates the `tipset.Height`
   * that you would like to retrieve.
   * @param serializedTipsetKey An optional tipset key, an array
   * of the Block RootCIDs that are part of the tipset. Must be
   * an exact match and must include exactly the same number of
   * blocks that are actually in the tipset.
   * @returns The matched tipset.
   */
  "Filecoin.ChainGetTipSetByHeight"(
    height: number,
    serializedTipsetKey?: Array<SerializedRootCID>
  ): Promise<SerializedTipset>;
  /**
   * Returns a block for the given RootCID.
   *
   * @param serializedBlockCid The RootCID of the block.
   * @returns The matched Block.
   */
  "Filecoin.ChainGetBlock"(
    serializedBlockCid: SerializedRootCID
  ): Promise<SerializedBlockHeader>;
  /**
   * Returns the BlockMessages object, or all of the messages
   * that are part of a block, for a given block RootCID.
   *
   * @param serializedBlockCid The RootCID of the block.
   * @returns The matched BlockMessages object.
   */
  "Filecoin.ChainGetBlockMessages"(
    serializedBlockCid: SerializedRootCID
  ): Promise<SerializedBlockMessages>;
  /**
   * Returns a Message for a given RootCID.
   *
   * @param serializedMessageCid The RootCID of the message.
   * @returns The matched Message object.
   */
  "Filecoin.ChainGetMessage"(
    serializedMessageCid: SerializedRootCID
  ): Promise<SerializedMessage>;
  /**
   * Gets the next nonce of an address, including any pending
   * messages in the current message pool.
   *
   * @param address A `string` of the public address.
   * @returns A `number` of the next nonce.
   */
  "Filecoin.MpoolGetNonce"(address: string): Promise<number>;
  /**
   * Submits a signed message to be added to the message
   * pool.
   *
   * Only value transfers are supported (`Method = 0`).
   *
   * @param signedMessage The SignedMessage object.
   * @returns The RootCID of the signed message.
   */
  "Filecoin.MpoolPush"(
    signedMessage: SerializedSignedMessage
  ): Promise<SerializedRootCID>;
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
   * @param signedMessages The array of SignedMessage objects.
   * @returns An array of RootCIDs for signed messages that
   * were valid and added to the message pool. The order of the
   * output array matches the order of the input array.
   */
  "Filecoin.MpoolBatchPush"(
    signedMessages: Array<SerializedSignedMessage>
  ): Promise<Array<SerializedRootCID>>;
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
   * @param message The Message object.
   * @param spec The MessageSendSpec object which defines
   * the MaxFee.
   * @returns The corresponding SignedMessage that was added
   * to the message pool.
   */
  "Filecoin.MpoolPushMessage"(
    message: SerializedMessage,
    spec: SerializedMessageSendSpec
  ): Promise<SerializedSignedMessage>;
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
   * @param messages The array of Message objects.
   * @param spec The MessageSendSpec object which defines
   * the MaxFee.
   * @returns An array of SignedMessages that were valid and
   * added to the message pool. The order of the output array
   * matches the order of the input array.
   */
  "Filecoin.MpoolBatchPushMessage"(
    messages: Array<SerializedMessage>,
    spec: SerializedMessageSendSpec
  ): Promise<Array<SerializedSignedMessage>>;
  /**
   * Clears the current pending message pool; any messages in
   * the pool will not be processed in the next tipset/block
   * mine.
   *
   * @param local In a normal Lotus node, setting this to `true`
   * will only clear local messages from the message pool. Since
   * Filecoin-flavored Ganache doesn't have a network, all messages
   * are local, and therefore all messages from the message pool
   * will be removed regardless of the value of this flag.
   */
  "Filecoin.MpoolClear"(local: boolean): Promise<void>;
  /**
   * Returns a list of messages in the current pending message
   * pool.
   *
   * @param tipsetKey A normal Lotus node accepts an optional single
   * parameter of the TipsetKey to refer to the pending messages.
   * However, with the design of Filecoin-flavored Ganache, this
   * parameter is not used.
   * @returns An array of SignedMessage objects that are in the message pool.
   */
  "Filecoin.MpoolPending"(
    tipsetKey: Array<RootCID>
  ): Promise<Array<SerializedSignedMessage>>;
  /**
   * Returns a list of pending messages for inclusion in the next block.
   * Since all messages in the message pool are included in the next
   * block for Filecoin-flavored Ganache, this method returns the same
   * result as `Filecoin.MpoolPending`.
   *
   * Reference implementation: https://git.io/Jt24C
   *
   * @param tipsetKey A normal Lotus node accepts an optional
   * parameter of the TipsetKey to refer to the pending messages.
   * However, with the design of Filecoin-flavored Ganache, this
   * parameter is not used in Ganache.
   * @param ticketQuality Since all messages are included in the next
   * block in Ganache, this number is ignored. A normal Lotus node uses
   * this number to help determine which messages are going to be included
   * in the next block. This parameter is also not used in Ganache.
   *
   * @returns
   */
  "Filecoin.MpoolSelect"(
    tipsetKey: Array<RootCID>,
    ticketQuality: number
  ): Promise<Array<SerializedSignedMessage>>;
  /**
   * Returns the miner actor address for the Filecoin-flavored
   * Ganache node. This value is always the same and doesn't change.
   *
   * @returns `t01000`
   */
  "Filecoin.ActorAddress"(): Promise<string>;
  /**
   * Returns a list of the miner addresses for the
   * Filecoin-flavored Ganache. Ganache always has
   * the same single miner.
   *
   * @returns `[ "t01000" ]`
   */
  "Filecoin.StateListMiners"(): Promise<Array<string>>;
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
   * @param minerAddress The miner address to get miner power for.
   * @returns The MinerPower object.
   */
  "Filecoin.StateMinerPower"(
    minerAddress: string
  ): Promise<SerializedMinerPower>;
  /**
   * Returns the miner info for the given miner address.
   *
   * @param minerAddress
   * @param tipsetKey A normal Lotus node uses tipsetKey to get the
   * miner info at that Tipset. However, the miner info in
   * Filecoin-flavored Ganache will not change based on the tipset,
   * so this parameter is ignored by Ganache.
   * @returns The MinerInfo object.
   */
  "Filecoin.StateMinerInfo"(
    minerAddress: string,
    tipsetKey: Array<RootCID>
  ): Promise<SerializedMinerInfo>;
  /**
   * Returns the default address of the wallet; this is also the first address
   * that is returned in `Filecoin.WalletList`.
   *
   * @returns A `string` of the public address.
   */
  "Filecoin.WalletDefaultAddress"(): Promise<SerializedAddress>;
  /**
   * Sets the default address to the provided address. This will move the
   * address from its current position in the `Filecoin.WalletList` response
   * to the front of the array. This change is persisted across Ganache sessions
   * if you are using a persisted database with `database.db` or
   * `database.dbPath` options.
   *
   * @param address The public address to set as the default address. Must be an address
   * that is in the wallet; see `Filecoin.WalletList` to get a list of addresses
   * in the wallet.
   */
  "Filecoin.WalletSetDefault"(address: string): Promise<void>;
  /**
   * Returns the balance of any address.
   *
   * @param address The public address to retrieve the balance for.
   * @returns A `string` of the `attoFIL` balance of `address`,
   * encoded in base-10 (aka decimal format).
   */
  "Filecoin.WalletBalance"(address: string): Promise<string>;
  /**
   * Generate a new random address to add to the wallet. This new
   * address is persisted across Ganache sessions if you are using
   * a persisted database with `database.db` or `database.dbPath` options.
   *
   * @param keyType The key type (`bls` or `secp256k1`) to use
   * to generate the address. KeyType of `secp256k1-ledger` is
   * not supported in Filecoin-flavored Ganache.
   * @returns The public address as a `string`.
   */
  "Filecoin.WalletNew"(keyType: KeyType): Promise<SerializedAddress>;
  /**
   * Returns the list of addresses in the wallet. The wallet stores the private
   * key of these addresses and therefore can sign messages and random bytes.
   *
   * @returns An array of `string`'s of each public address in the wallet.
   */
  "Filecoin.WalletList"(): Promise<Array<SerializedAddress>>;
  /**
   * Checks whether or not the wallet includes the provided address.
   *
   * @param address The public address of type `string` to check.
   * @returns `true` if the address is in the wallet, `false` otherwise.
   */
  "Filecoin.WalletHas"(address: string): Promise<boolean>;
  /**
   * Removes the address from the wallet. This method is unrecoverable.
   * If you want to recover the address removed from this method, you
   * must use `Filecoin.WalletImport` with the correct private key.
   * Removing addresses from the wallet will persist between Ganache
   * sessions if you are using a persisted database with
   * `database.db` or `database.dbPath` options.
   *
   * @param address A `string` of the public address to remove.
   */
  "Filecoin.WalletDelete"(address: string): Promise<void>;
  /**
   * Exports the private key information from an address stored in the wallet.
   *
   * @param address A `string` of the public address to export.
   * @returns The KeyInfo object.
   */
  "Filecoin.WalletExport"(address: string): Promise<SerializedKeyInfo>;
  /**
   * Imports an address into the wallet with provided private key info.
   * Use this method to add more addresses to the wallet. Adding addresses
   * to the wallet will persist between Ganache sessions if you are using
   * a persisted database with with `database.db` or `database.dbPath` options.
   *
   * @param serializedKeyInfo The private key KeyInfo object for the address to import.
   * @returns The corresponding public address of type `string`.
   */
  "Filecoin.WalletImport"(
    serializedKeyInfo: SerializedKeyInfo
  ): Promise<SerializedAddress>;
  /**
   * Signs an arbitrary byte string using the private key info
   * stored in the wallet.
   *
   * @param address A `string` of the public address in the wallet to
   * sign with.
   * @param data A `string` of a base-64 encoded byte array to sign.
   * @returns A Signature object which contains the signature details.
   */
  "Filecoin.WalletSign"(
    address: string,
    data: string
  ): Promise<SerializedSignature>;
  /**
   * Signs a Message using the private key info stored in the wallet.
   *
   * @param address A `string` of the public address in the wallet to
   * sign with.
   * @param serializedMessage A Message object that needs signing.
   * @returns The corresponding SignedMessage object.
   */
  "Filecoin.WalletSignMessage"(
    address: string,
    serializedMessage: SerializedMessage
  ): Promise<SerializedSignedMessage>;
  /**
   * Verifies the validity of a signature for a given address
   * and unsigned byte string.
   *
   * @param inputAddress A `string` of the public address that
   * supposedly signed `data` with `serializedSignature`
   * @param data A `string` of the data that was signed, encoded
   * in base-64.
   * @param serializedSignature A Signature object of the signature
   * you're trying to verify.
   * @returns `true` if valid, `false` otherwise.
   */
  "Filecoin.WalletVerify"(
    inputAddress: string,
    data: string,
    serializedSignature: SerializedSignature
  ): Promise<boolean>;
  /**
   * Checks the validity of a given public address.
   *
   * @param inputAddress The `string` of the public address to check.
   * @returns If successful, it returns the address back as a `string.
   * Otherwise returns an error.
   */
  "Filecoin.WalletValidateAddress"(
    inputAddress: string
  ): Promise<SerializedAddress>;
  /**
   * Start a storage deal. The data must already be uploaded to
   * the Ganache IPFS node. Deals are automatically accepted
   * as long as the public address in `Wallet` is in Ganache's
   * wallet (see `Filecoin.WalletList` or `Filecoin.WalletHas`
   * to check). Storage deals in Ganache automatically progress
   * each tipset from one state to the next towards the
   * StorageDealStatusActive state.
   *
   * @param serializedProposal A StartDealParams object of the deal details.
   * @returns The RootCID of the new `DealInfo` => `DealInfo.ProposalCid`
   */
  "Filecoin.ClientStartDeal"(
    serializedProposal: SerializedStartDealParams
  ): Promise<SerializedRootCID>;
  /**
   * List all storage deals regardless of state, including expired deals.
   *
   * @returns An array of DealInfo objects.
   */
  "Filecoin.ClientListDeals"(): Promise<Array<SerializedDealInfo>>;
  /**
   * Get the detailed info of a storage deal.
   *
   * Reference implementation: https://git.io/JthfU
   *
   * @param serializedCid The `DealInfo.ProposalCid` RootCID for the
   * deal you're searching for
   * @returns A DealInfo object.
   */
  "Filecoin.ClientGetDealInfo"(
    serializedCid: SerializedRootCID
  ): Promise<SerializedDealInfo>;
  /**
   * Get the corresponding string that represents a StorageDealStatus
   * code.
   *
   * Reference implementation: https://git.io/JqUXg
   *
   * @param statusCode A `number` that's stored in `DealInfo.State`
   * which represents the current state of a storage deal.
   * @returns A `string` representation of the provided `statusCode`.
   */
  "Filecoin.ClientGetDealStatus"(statusCode: number): Promise<string>;
  /**
   * Starts a subscription to receive updates when storage deals
   * change state.
   *
   * @param rpcId This parameter is not provided by the user, but
   * injected by the internal system.
   * @returns An object with the subscription ID and an unsubscribe
   * function.
   */
  "Filecoin.ClientGetDealUpdates"(rpcId?: string): PromiEvent<Subscription>;
  /**
   * Ask the node to search for data stored in the IPFS node.
   *
   * @param rootCid The RootCID to search for.
   * @returns A QueryOffer with details of the data for further
   * retrieval.
   */
  "Filecoin.ClientFindData"(
    rootCid: SerializedRootCID
  ): Promise<Array<SerializedQueryOffer>>;
  /**
   * Returns whether or not the local IPFS node has the data
   * requested. Since Filecoin-flavored Ganache doesn't connect
   * to any external networks, all data on the IPFS node is local.
   *
   * @param rootCid The RootCID to serach for.
   * @returns `true` if the local IPFS node has the data,
   * `false` otherwise.
   */
  "Filecoin.ClientHasLocal"(rootCid: SerializedRootCID): Promise<boolean>;
  /**
   * Download the contents of a storage deal to disk (local
   * to Ganache).
   *
   * @param retrievalOrder A RetrievalOrder object detailing
   * the deal, retrieval price, etc.
   * @param ref A FileRef object specifying where the file
   * should be saved to.
   */
  "Filecoin.ClientRetrieve"(
    retrievalOrder: SerializedRetrievalOrder,
    ref: SerializedFileRef
  ): Promise<void>;
  /**
   * Manually mine a tipset immediately. Mines even if the
   * miner is disabled.
   *
   * @returns The Tipset object that was mined.
   */
  "Ganache.MineTipset"(): Promise<SerializedTipset>;
  /**
   * Enables the miner.
   */
  "Ganache.EnableMiner"(): Promise<void>;
  /**
   * Disables the miner.
   */
  "Ganache.DisableMiner"(): Promise<void>;
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
  "Ganache.MinerEnabled"(): Promise<boolean>;
  /**
   * A subscription method that provides an update
   * whenever the miner is enabled or disabled.
   *
   * @param rpcId This parameter is not provided by the user, but
   * injected by the internal system.
   * @returns An object with the subscription ID and an unsubscribe
   * function.
   */
  "Ganache.MinerEnabledNotify"(rpcId?: string): PromiEvent<Subscription>;
  /**
   * Retrieves an internal `DealInfo` by its `DealID`.
   *
   * @param dealId A `number` corresponding to the `DealInfo.DealID`
   * for the deal to retrieve.
   * @returns The matched DealInfo object.
   */
  "Ganache.GetDealById"(dealId: number): Promise<SerializedDealInfo>;
}
