import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
declare type DataTransferChannelConfig = {
  properties: {
    transferId: {
      type: number;
      serializedType: number;
      serializedName: "TransferID";
    };
    status: {
      type: number;
      serializedType: number;
      serializedName: "Status";
    };
    baseCID: {
      type: RootCID;
      serializedType: SerializedRootCID;
      serializedName: "BaseCID";
    };
    isInitiator: {
      type: boolean;
      serializedType: boolean;
      serializedName: "IsInitiator";
    };
    isSender: {
      type: boolean;
      serializedType: boolean;
      serializedName: "IsSender";
    };
    voucher: {
      type: string;
      serializedType: string;
      serializedName: "Voucher";
    };
    message: {
      type: string;
      serializedType: string;
      serializedName: "Message";
    };
    otherPeer: {
      type: string;
      serializedType: string;
      serializedName: "OtherPeer";
    };
    transferred: {
      type: number;
      serializedType: number;
      serializedName: "Transferred";
    };
  };
};
declare class DataTransferChannel
  extends SerializableObject<DataTransferChannelConfig>
  implements DeserializedObject<DataTransferChannelConfig> {
  get config(): Definitions<DataTransferChannelConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<DataTransferChannelConfig>>
      | Partial<DeserializedObject<DataTransferChannelConfig>>
  );
  transferId: number;
  status: number;
  baseCID: RootCID;
  isInitiator: boolean;
  isSender: boolean;
  voucher: string;
  message: string;
  otherPeer: string;
  transferred: number;
}
declare type SerializedDataTransferChannel = SerializedObject<DataTransferChannelConfig>;
export { DataTransferChannel, SerializedDataTransferChannel };
