import { RootCID, SerializedRootCID } from "./root-cid";
import { StorageDealStatus } from "../types/storage-deal-status";
import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
import {
  SerializedStorageMarketDataRef,
  StorageMarketDataRef
} from "./storage-market-data-ref";
import { ChannelID, SerializedChannelID } from "./channel-id";
import {
  DataTransferChannel,
  SerializedDataTransferChannel
} from "./data-transfer-channel";
declare type DealInfoConfig = {
  properties: {
    proposalCid: {
      type: RootCID;
      serializedType: SerializedRootCID;
      serializedName: "ProposalCid";
    };
    state: {
      type: StorageDealStatus;
      serializedType: StorageDealStatus;
      serializedName: "State";
    };
    message: {
      type: string;
      serializedType: string;
      serializedName: "Message";
    };
    provider: {
      type: string;
      serializedType: string;
      serializedName: "Provider";
    };
    dataRef: {
      type: StorageMarketDataRef;
      serializedType: SerializedStorageMarketDataRef;
      serializedName: "DataRef";
    };
    pieceCid: {
      type: RootCID | null;
      serializedType: SerializedRootCID | null;
      serializedName: "PieceCID";
    };
    size: {
      type: number;
      serializedType: number;
      serializedName: "Size";
    };
    pricePerEpoch: {
      type: bigint;
      serializedType: string;
      serializedName: "PricePerEpoch";
    };
    duration: {
      type: number;
      serializedType: number;
      serializedName: "Duration";
    };
    dealId: {
      type: number;
      serializedType: number;
      serializedName: "DealID";
    };
    creationTime: {
      type: Date;
      serializedType: string;
      serializedName: "CreationTime";
    };
    verified: {
      type: boolean;
      serializedType: boolean;
      serializedName: "Verified";
    };
    transferChannelId: {
      type: ChannelID;
      serializedType: SerializedChannelID;
      serializedName: "TransferChannelID";
    };
    dataTransfer: {
      type: DataTransferChannel;
      serializedType: SerializedDataTransferChannel;
      serializedName: "DataTransfer";
    };
  };
};
declare type C = DealInfoConfig;
declare class DealInfo
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  proposalCid: RootCID;
  state: StorageDealStatus;
  message: string;
  provider: string;
  dataRef: StorageMarketDataRef;
  pieceCid: RootCID | null;
  size: number;
  pricePerEpoch: bigint;
  duration: number;
  dealId: number;
  creationTime: Date;
  verified: boolean;
  transferChannelId: ChannelID;
  dataTransfer: DataTransferChannel;
  advanceState(): void;
}
declare type SerializedDealInfo = SerializedObject<C>;
export { DealInfo, SerializedDealInfo };
