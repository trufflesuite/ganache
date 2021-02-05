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
declare type StartDealParamsConfig = {
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
declare class StartDealParams
  extends SerializableObject<StartDealParamsConfig>
  implements DeserializedObject<StartDealParamsConfig> {
  get config(): Definitions<StartDealParamsConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<StartDealParamsConfig>>
      | Partial<DeserializedObject<StartDealParamsConfig>>
  );
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
declare type SerializedStartDealParams = SerializedObject<StartDealParamsConfig>;
export { StartDealParams, SerializedStartDealParams };
