import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { RetrievalPeer, SerializedRetrievalPeer } from "./retrieval-peer";
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
      type: string;
      serializedType: string;
      serializedName: "Miner";
    };
    minerPeer: {
      type: RetrievalPeer;
      serializedType: SerializedRetrievalPeer;
      serializedName: "MinerPeer";
    };
  };
};
declare type C = QueryOfferConfig;
declare class QueryOffer
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  err: string;
  root: RootCID;
  piece: RootCID;
  size: number;
  minPrice: bigint;
  unsealPrice: bigint;
  paymentInterval: number;
  paymentIntervalIncrease: number;
  miner: string;
  minerPeer: RetrievalPeer;
}
declare type SerializedQueryOffer = SerializedObject<C>;
export { QueryOffer, SerializedQueryOffer };
