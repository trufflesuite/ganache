import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { RetrievalPeer, SerializedRetrievalPeer } from "./retrieval-peer";
import { Address, SerializedAddress } from "./address";
declare type QueryOfferConfig = {
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
    piece: {
      type: RootCID;
      serializedType: SerializedRootCID;
      serializedName: "Piece";
    };
    size: {
      type: number;
      serializedType: number;
      serializedName: "Size";
    };
    minPrice: {
      type: bigint;
      serializedType: string;
      serializedName: "MinPrice";
    };
    unsealPrice: {
      type: bigint;
      serializedType: string;
      serializedName: "UnsealPrice";
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
      type: Address;
      serializedType: SerializedAddress;
      serializedName: "Miner";
    };
    minerPeer: {
      type: RetrievalPeer;
      serializedType: SerializedRetrievalPeer;
      serializedName: "MinerPeer";
    };
  };
};
declare class QueryOffer
  extends SerializableObject<QueryOfferConfig>
  implements DeserializedObject<QueryOfferConfig> {
  get config(): Definitions<QueryOfferConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<QueryOfferConfig>>
      | Partial<DeserializedObject<QueryOfferConfig>>
  );
  err: string;
  root: RootCID;
  piece: RootCID;
  size: number;
  minPrice: bigint;
  unsealPrice: bigint;
  paymentInterval: number;
  paymentIntervalIncrease: number;
  miner: Address;
  minerPeer: RetrievalPeer;
}
declare type SerializedQueryOffer = SerializedObject<QueryOfferConfig>;
export { QueryOffer, SerializedQueryOffer };
