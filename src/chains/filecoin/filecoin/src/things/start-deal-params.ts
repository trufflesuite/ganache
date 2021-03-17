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

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/api#StartDealParams

type StartDealParamsConfig = {
  properties: {
    data: {
      type: StorageMarketDataRef;
      serializedType: SerializedStorageMarketDataRef;
      serializedName: "Data";
    };
    wallet: {
      type: Address | null;
      serializedType: SerializedAddress | null;
      serializedName: "Wallet";
    };
    miner: {
      type: Address;
      serializedType: SerializedAddress;
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
        deserializedName: "data",
        serializedName: "Data",
        defaultValue: options => new StorageMarketDataRef(options)
      },
      wallet: {
        deserializedName: "wallet",
        serializedName: "Wallet",
        defaultValue: options => (options ? new Address(options) : null)
      },
      miner: {
        deserializedName: "miner",
        serializedName: "Miner",
        defaultValue: literal =>
          literal ? new Address(literal) : Address.fromId(0, false, true)
      },
      epochPrice: {
        deserializedName: "epochPrice",
        serializedName: "EpochPrice",
        defaultValue: literal => (literal ? BigInt(literal) : 2500n)
      },
      minBlocksDuration: {
        deserializedName: "minBlocksDuration",
        serializedName: "MinBlocksDuration",
        defaultValue: 300
      },
      providerCollateral: {
        deserializedName: "providerCollateral",
        serializedName: "ProviderCollateral",
        defaultValue: literal => (literal ? BigInt(literal) : 0n)
      },
      dealStartEpoch: {
        deserializedName: "dealStartEpoch",
        serializedName: "dealStartEpoch",
        defaultValue: 0
      },
      fastRetrieval: {
        deserializedName: "fastRetrieval",
        serializedName: "FastRetrieval",
        defaultValue: false
      },
      verifiedDeal: {
        deserializedName: "verifiedDeal",
        serializedName: "VerifiedDeal",
        defaultValue: false
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<StartDealParamsConfig>>
      | Partial<DeserializedObject<StartDealParamsConfig>>
  ) {
    super();

    this.data = super.initializeValue(this.config.data, options);
    this.wallet = super.initializeValue(this.config.wallet, options);
    this.miner = super.initializeValue(this.config.miner, options);
    this.epochPrice = super.initializeValue(this.config.epochPrice, options);
    this.minBlocksDuration = super.initializeValue(
      this.config.minBlocksDuration,
      options
    );
    this.providerCollateral = super.initializeValue(
      this.config.providerCollateral,
      options
    );
    this.dealStartEpoch = super.initializeValue(
      this.config.dealStartEpoch,
      options
    );
    this.fastRetrieval = super.initializeValue(
      this.config.fastRetrieval,
      options
    );
    this.verifiedDeal = super.initializeValue(
      this.config.verifiedDeal,
      options
    );
  }

  data: StorageMarketDataRef;
  wallet: Address | null;
  miner: Address;
  epochPrice: bigint;
  minBlocksDuration: number;
  providerCollateral: bigint;
  dealStartEpoch: number;
  fastRetrieval: boolean;
  verifiedDeal: boolean;
}

type SerializedStartDealParams = SerializedObject<StartDealParamsConfig>;

export { StartDealParams, SerializedStartDealParams };
