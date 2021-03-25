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
  stop(): Promise<void>;
  "Filecoin.Version"(): Promise<SerializedVersion>;
  "Filecoin.ID"(): Promise<string>;
  "Filecoin.ChainGetGenesis"(): Promise<SerializedTipset>;
  "Filecoin.ChainHead"(): Promise<SerializedTipset>;
  "Filecoin.ChainNotify"(rpcId?: string): PromiEvent<Subscription>;
  [SubscriptionMethod.ChannelClosed](
    subscriptionId: SubscriptionId
  ): Promise<boolean>;
  "Filecoin.ChainGetTipSet"(
    serializedTipsetKey: Array<SerializedRootCID>
  ): Promise<SerializedTipset>;
  "Filecoin.ChainGetTipSetByHeight"(
    height: number,
    serializedTipsetKey?: Array<SerializedRootCID>
  ): Promise<SerializedTipset>;
  "Filecoin.ChainGetBlock"(
    serializedBlockCid: SerializedRootCID
  ): Promise<SerializedBlockHeader>;
  "Filecoin.ChainGetBlockMessages"(
    serializedBlockCid: SerializedRootCID
  ): Promise<SerializedBlockMessages>;
  "Filecoin.ChainGetMessage"(
    serializedMessageCid: SerializedRootCID
  ): Promise<SerializedMessage>;
  "Filecoin.MpoolGetNonce"(address: string): Promise<number>;
  "Filecoin.MpoolPush"(
    signedMessage: SerializedSignedMessage
  ): Promise<SerializedRootCID>;
  "Filecoin.MpoolBatchPush"(
    signedMessages: Array<SerializedSignedMessage>
  ): Promise<Array<SerializedRootCID>>;
  "Filecoin.MpoolPushMessage"(
    message: SerializedMessage,
    spec: SerializedMessageSendSpec
  ): Promise<SerializedSignedMessage>;
  "Filecoin.MpoolBatchPushMessage"(
    messages: Array<SerializedMessage>,
    spec: SerializedMessageSendSpec
  ): Promise<Array<SerializedSignedMessage>>;
  "Filecoin.MpoolClear"(local: boolean): Promise<void>;
  "Filecoin.MpoolPending"(): Promise<Array<SerializedSignedMessage>>;
  "Filecoin.MpoolSelect"(): Promise<Array<SerializedSignedMessage>>;
  "Filecoin.ActorAddress"(): Promise<string>;
  "Filecoin.StateListMiners"(): Promise<Array<string>>;
  "Filecoin.StateMinerPower"(
    minerAddress: string
  ): Promise<SerializedMinerPower>;
  "Filecoin.StateMinerInfo"(minerAddress: string): Promise<SerializedMinerInfo>;
  "Filecoin.WalletDefaultAddress"(): Promise<SerializedAddress>;
  "Filecoin.WalletSetDefault"(address: string): Promise<void>;
  "Filecoin.WalletBalance"(address: string): Promise<string>;
  "Filecoin.WalletNew"(keyType: KeyType): Promise<SerializedAddress>;
  "Filecoin.WalletList"(): Promise<Array<SerializedAddress>>;
  "Filecoin.WalletHas"(address: string): Promise<boolean>;
  "Filecoin.WalletDelete"(address: string): Promise<void>;
  "Filecoin.WalletExport"(address: string): Promise<SerializedKeyInfo>;
  "Filecoin.WalletImport"(
    serializedKeyInfo: SerializedKeyInfo
  ): Promise<SerializedAddress>;
  "Filecoin.WalletSign"(
    address: string,
    data: string
  ): Promise<SerializedSignature>;
  "Filecoin.WalletSignMessage"(
    address: string,
    serializedMessage: SerializedMessage
  ): Promise<SerializedSignedMessage>;
  "Filecoin.WalletVerify"(
    inputAddress: string,
    data: string,
    serializedSignature: SerializedSignature
  ): Promise<boolean>;
  "Filecoin.WalletValidateAddress"(
    inputAddress: string
  ): Promise<SerializedAddress>;
  "Filecoin.ClientStartDeal"(
    serializedProposal: SerializedStartDealParams
  ): Promise<SerializedRootCID>;
  "Filecoin.ClientListDeals"(): Promise<Array<SerializedDealInfo>>;
  "Filecoin.ClientGetDealInfo"(
    serializedCid: SerializedRootCID
  ): Promise<SerializedDealInfo>;
  "Filecoin.ClientGetDealStatus"(statusCode: number): Promise<string>;
  "Filecoin.ClientGetDealUpdates"(rpcId?: string): PromiEvent<Subscription>;
  "Filecoin.ClientFindData"(
    rootCid: SerializedRootCID
  ): Promise<Array<SerializedQueryOffer>>;
  "Filecoin.ClientHasLocal"(rootCid: SerializedRootCID): Promise<boolean>;
  "Filecoin.ClientRetrieve"(
    retrievalOrder: SerializedRetrievalOrder,
    ref: SerializedFileRef
  ): Promise<object>;
  "Ganache.MineTipset"(): Promise<SerializedTipset>;
  "Ganache.EnableMiner"(): Promise<void>;
  "Ganache.DisableMiner"(): Promise<void>;
  "Ganache.MinerEnabled"(): Promise<boolean>;
  "Ganache.MinerEnabledNotify"(rpcId?: string): PromiEvent<Subscription>;
  "Ganache.GetDealById"(dealId: number): Promise<SerializedDealInfo>;
}
