import { RootCID, SerializedRootCID } from "./root-cid";
import { Miner, SerializedMiner } from "./miner";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
declare type RetrievalOfferConfig = {
  properties: {
    err: {
      type: string;
      serializedType: string;
      serializedName: "Err";
    };
    root: {
      type: RootCID;
      serializedType: SerializedRootCID;
      serializedName: "Root";
    };
    size: {
      type: number;
      serializedType: number;
      serializedName: "Size";
    };
    minPrice: {
      type: string;
      serializedType: string;
      serializedName: "MinPrice";
    };
    paymentInterval: {
      type: number;
      serializedType: number;
      serializedName: "PaymentInterval";
    };
    paymentIntervalIncrease: {
      type: number;
      serializedType: number;
      serializedName: "PaymentIntervalIncrease";
    };
    miner: {
      type: Miner;
      serializedType: SerializedMiner;
      serializedName: "Miner";
    };
    minerPeerId: {
      type: string;
      serializedType: string;
      serializedName: "MinerPeerID";
    };
  };
};
declare class RetrievalOffer
  extends SerializableObject<RetrievalOfferConfig>
  implements DeserializedObject<RetrievalOfferConfig> {
  get config(): Definitions<RetrievalOfferConfig>;
  err: string;
  root: RootCID;
  size: number;
  minPrice: string;
  paymentInterval: number;
  paymentIntervalIncrease: number;
  miner: Miner;
  minerPeerId: string;
}
declare type SerializedRetrievalOffer = SerializedObject<RetrievalOfferConfig>;
export { RetrievalOffer, SerializedRetrievalOffer };
