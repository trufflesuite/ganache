import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/api#DataTransferChannel

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
        deserializedName: "transferId",
        serializedName: "TransferID",
        defaultValue: 0
      },
      status: {
        deserializedName: "status",
        serializedName: "Status",
        defaultValue: 0
      },
      baseCID: {
        deserializedName: "baseCID",
        serializedName: "BaseCID",
        defaultValue: options =>
          options ? new RootCID(options) : new RootCID({ "/": "Unknown" })
      },
      isInitiator: {
        deserializedName: "isInitiator",
        serializedName: "IsInitiator",
        defaultValue: false
      },
      isSender: {
        deserializedName: "isSender",
        serializedName: "IsSender",
        defaultValue: false
      },
      voucher: {
        deserializedName: "voucher",
        serializedName: "Voucher",
        defaultValue: ""
      },
      message: {
        deserializedName: "message",
        serializedName: "Message",
        defaultValue: ""
      },
      otherPeer: {
        deserializedName: "otherPeer",
        serializedName: "OtherPeer",
        defaultValue: ""
      },
      transferred: {
        deserializedName: "transferred",
        serializedName: "Transferred",
        defaultValue: 0
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<DataTransferChannelConfig>>
      | Partial<DeserializedObject<DataTransferChannelConfig>>
  ) {
    super();

    this.transferId = super.initializeValue(this.config.transferId, options);
    this.status = super.initializeValue(this.config.status, options);
    this.baseCID = super.initializeValue(this.config.baseCID, options);
    this.isInitiator = super.initializeValue(this.config.isInitiator, options);
    this.isSender = super.initializeValue(this.config.isSender, options);
    this.voucher = super.initializeValue(this.config.voucher, options);
    this.message = super.initializeValue(this.config.message, options);
    this.otherPeer = super.initializeValue(this.config.otherPeer, options);
    this.transferred = super.initializeValue(this.config.transferred, options);
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

type SerializedDataTransferChannel = SerializedObject<DataTransferChannelConfig>;

export { DataTransferChannel, SerializedDataTransferChannel };
