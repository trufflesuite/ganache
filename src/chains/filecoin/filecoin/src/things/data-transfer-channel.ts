import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/lotus/api#DataTransferChannel

type DataTransferChannelConfig = {
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

class DataTransferChannel
  extends SerializableObject<DataTransferChannelConfig>
  implements DeserializedObject<DataTransferChannelConfig> {
  get config(): Definitions<DataTransferChannelConfig> {
    return {
      transferId: {
        serializedName: "TransferID"
      },
      status: {
        serializedName: "Status"
      },
      baseCID: {
        serializedName: "BaseCID",
        defaultValue: options =>
          options ? new RootCID(options) : new RootCID({ "/": "Unknown" })
      },
      isInitiator: {
        serializedName: "IsInitiator"
      },
      isSender: {
        serializedName: "IsSender"
      },
      voucher: {
        serializedName: "Voucher"
      },
      message: {
        serializedName: "Message"
      },
      otherPeer: {
        serializedName: "OtherPeer"
      },
      transferred: {
        serializedName: "Transferred"
      }
    };
  }

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

type SerializedDataTransferChannel = SerializedObject<
  DataTransferChannelConfig
>;

export { DataTransferChannel, SerializedDataTransferChannel };
