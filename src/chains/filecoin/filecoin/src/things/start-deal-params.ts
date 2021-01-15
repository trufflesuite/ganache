import {
  StorageMarketDataRef,
  SerializedStorageMarketDataRef
} from "./storage-market-data-ref";
import { Address, SerializedAddress } from "./address";
import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/lotus/api#StartDealParams

type StartDealParamsConfig = {
  properties: {
    data: {
      type: StorageMarketDataRef;
      serializedType: SerializedStorageMarketDataRef;
      serializedName: "Data";
    };
    wallet: {
      type: Address;
      serializedType: SerializedAddress;
      serializedName: "Wallet";
    };
    miner: {
      type: string; // using string until we can support more address types in Address
      serializedType: string;
      serializedName: "Miner";
    };
    epochPrice: {
      type: bigint;
      serializedType: string;
      serializedName: "EpochPrice";
    };
    minBlocksDuration: {
      type: number;
      serializedType: number;
      serializedName: "MinBlocksDuration";
    };
    providerCollateral: {
      type: bigint;
      serializedType: string;
      serializedName: "ProviderCollateral";
    };
    dealStartEpoch: {
      type: number;
      serializedType: number;
      serializedName: "dealStartEpoch";
    };
    fastRetrieval: {
      type: boolean;
      serializedType: boolean;
      serializedName: "FastRetrieval";
    };
    verifiedDeal: {
      type: boolean;
      serializedType: boolean;
      serializedName: "VerifiedDeal";
    };
  };
};

class StartDealParams
  extends SerializableObject<StartDealParamsConfig>
  implements DeserializedObject<StartDealParamsConfig> {
  get config(): Definitions<StartDealParamsConfig> {
    return {
      data: {
        serializedName: "Data",
        defaultValue: options => new StorageMarketDataRef(options)
      },
      wallet: {
        serializedName: "Wallet"
      },
      miner: {
        serializedName: "Miner",
        defaultValue: "t01000"
      },
      epochPrice: {
        serializedName: "EpochPrice",
        defaultValue: 2500n
      },
      minBlocksDuration: {
        serializedName: "MinBlocksDuration",
        defaultValue: 300
      },
      providerCollateral: {
        serializedName: "ProviderCollateral"
      },
      dealStartEpoch: {
        serializedName: "dealStartEpoch"
      },
      fastRetrieval: {
        serializedName: "FastRetrieval"
      },
      verifiedDeal: {
        serializedName: "VerifiedDeal"
      }
    };
  }

  data: StorageMarketDataRef;
  wallet: Address;
  miner: string;
  epochPrice: bigint;
  minBlocksDuration: number;
  providerCollateral: bigint;
  dealStartEpoch: number;
  fastRetrieval: boolean;
  verifiedDeal: boolean;
}

type SerializedStartDealParams = SerializedObject<StartDealParamsConfig>;

export { StartDealParams, SerializedStartDealParams };
