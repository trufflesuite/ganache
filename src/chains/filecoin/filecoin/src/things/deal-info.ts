import { RootCID, SerializedRootCID } from "./root-cid";
import {
  StorageDealStatus,
  nextSuccessfulState
} from "../types/storage-deal-status";
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
import { Address, SerializedAddress } from "./address";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/api#DealInfo

type DealInfoConfig = {
  properties: {
    proposalCid: {
      type: RootCID;
      serializedType: SerializedRootCID;
      serializedName: "ProposalCid";
    };
    state: {
      type: StorageDealStatus;
      serializedType: StorageDealStatus; // Remember: Enums are numbers at runtime!,
      serializedName: "State";
    };
    message: {
      type: string;
      serializedType: string;
      serializedName: "Message";
    };
    provider: {
      type: Address;
      serializedType: SerializedAddress;
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

class DealInfo
  extends SerializableObject<DealInfoConfig>
  implements DeserializedObject<DealInfoConfig> {
  get config(): Definitions<DealInfoConfig> {
    return {
      proposalCid: {
        deserializedName: "proposalCid",
        serializedName: "ProposalCid",
        defaultValue: options => new RootCID(options)
      },
      state: {
        deserializedName: "state",
        serializedName: "State",
        defaultValue: StorageDealStatus.Unknown
      },
      message: {
        deserializedName: "message",
        serializedName: "Message",
        defaultValue: ""
      },
      provider: {
        deserializedName: "provider",
        serializedName: "Provider",
        defaultValue: literal =>
          literal ? new Address(literal) : Address.fromId(0, false, true)
      },
      dataRef: {
        deserializedName: "dataRef",
        serializedName: "DataRef",
        defaultValue: options => new StorageMarketDataRef(options)
      },
      pieceCid: {
        deserializedName: "pieceCid",
        serializedName: "PieceCID",
        defaultValue: options => (options ? new RootCID(options) : null)
      },
      size: {
        deserializedName: "size",
        serializedName: "Size",
        defaultValue: 0
      },
      pricePerEpoch: {
        deserializedName: "pricePerEpoch",
        serializedName: "PricePerEpoch",
        defaultValue: literal => (literal ? BigInt(literal) : 0n)
      },
      duration: {
        deserializedName: "duration",
        serializedName: "Duration",
        defaultValue: 0
      },
      dealId: {
        deserializedName: "dealId",
        serializedName: "DealID",
        defaultValue: 0
      },
      creationTime: {
        deserializedName: "creationTime",
        serializedName: "CreationTime",
        defaultValue: new Date()
      },
      verified: {
        deserializedName: "verified",
        serializedName: "Verified",
        defaultValue: false
      },
      transferChannelId: {
        deserializedName: "transferChannelId",
        serializedName: "TransferChannelID",
        defaultValue: options => new ChannelID(options)
      },
      dataTransfer: {
        deserializedName: "dataTransfer",
        serializedName: "DataTransfer",
        defaultValue: options => new DataTransferChannel(options)
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<DealInfoConfig>>
      | Partial<DeserializedObject<DealInfoConfig>>
  ) {
    super();

    this.proposalCid = super.initializeValue(this.config.proposalCid, options);
    this.state = super.initializeValue(this.config.state, options);
    this.message = super.initializeValue(this.config.message, options);
    this.provider = super.initializeValue(this.config.provider, options);
    this.dataRef = super.initializeValue(this.config.dataRef, options);
    this.pieceCid = super.initializeValue(this.config.pieceCid, options);
    this.size = super.initializeValue(this.config.size, options);
    this.pricePerEpoch = super.initializeValue(
      this.config.pricePerEpoch,
      options
    );
    this.duration = super.initializeValue(this.config.duration, options);
    this.dealId = super.initializeValue(this.config.dealId, options);
    this.creationTime = super.initializeValue(
      this.config.creationTime,
      options
    );
    this.verified = super.initializeValue(this.config.verified, options);
    this.transferChannelId = super.initializeValue(
      this.config.transferChannelId,
      options
    );
    this.dataTransfer = super.initializeValue(
      this.config.dataTransfer,
      options
    );
  }

  proposalCid: RootCID;
  state: StorageDealStatus;
  message: string;
  provider: Address;
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

  advanceState() {
    this.state = nextSuccessfulState[this.state];
  }
}

type SerializedDealInfo = SerializedObject<DealInfoConfig>;

export { DealInfo, DealInfoConfig, SerializedDealInfo };
