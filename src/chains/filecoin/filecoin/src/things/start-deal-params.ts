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

type C = StartDealParamsConfig;

class StartDealParams
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C> {
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
        defaultValue: "t01000"
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
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
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
  miner: string;
  epochPrice: bigint;
  minBlocksDuration: number;
  providerCollateral: bigint;
  dealStartEpoch: number;
  fastRetrieval: boolean;
  verifiedDeal: boolean;
}

type SerializedStartDealParams = SerializedObject<C>;

export { StartDealParams, SerializedStartDealParams };
