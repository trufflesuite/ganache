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

// https://pkg.go.dev/github.com/filecoin-project/lotus/api#DealInfo

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
      type: string; // using string until we can support more address types in Address
      serializedType: string;
      serializedName: "Provider";
    };
    dataRef: {
      type: StorageMarketDataRef;
      serializedType: SerializedStorageMarketDataRef;
      serializedName: "DataRef";
    };
    pieceCid: {
      type: RootCID;
      serializedType: SerializedRootCID;
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
        serializedName: "ProposalCid",
        defaultValue: options => new RootCID(options)
      },
      state: {
        serializedName: "State"
      },
      message: {
        serializedName: "Message"
      },
      provider: {
        serializedName: "Provider",
        defaultValue: "t01000"
      },
      dataRef: {
        serializedName: "DataRef"
      },
      pieceCid: {
        serializedName: "PieceCID"
      },
      size: {
        serializedName: "Size"
      },
      pricePerEpoch: {
        serializedName: "PricePerEpoch"
      },
      duration: {
        serializedName: "Duration"
      },
      dealId: {
        serializedName: "DealID"
      },
      creationTime: {
        serializedName: "CreationTime",
        defaultValue: new Date()
      },
      verified: {
        serializedName: "Verified"
      },
      transferChannelId: {
        serializedName: "TransferChannelID"
      },
      dataTransfer: {
        serializedName: "DataTransfer"
      }
    };
  }

  proposalCid: RootCID;
  state: StorageDealStatus;
  message: string;
  provider: string;
  dataRef: StorageMarketDataRef;
  pieceCid: RootCID;
  size: number;
  pricePerEpoch: bigint;
  duration: number;
  dealId: number;
  creationTime: Date;
  verified: boolean;
  transferChannelId: ChannelID;
  dataTransfer: DataTransferChannel;

  advanceState(fullyAdvance: boolean = false) {
    if (fullyAdvance) {
      this.state = StorageDealStatus.Active;
    } else {
      this.state = nextSuccessfulState[this.state];
    }
  }
}

type SerializedDealInfo = SerializedObject<DealInfoConfig>;

export { DealInfo, SerializedDealInfo };
