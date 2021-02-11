import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { RetrievalPeer, SerializedRetrievalPeer } from "./retrieval-peer";
declare type RetrievalOrderConfig = {
  properties: {
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
    total: {
      type: bigint;
      serializedType: string;
      serializedName: "Total";
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
    client: {
      type: string;
      serializedType: string;
      serializedName: "Client";
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
declare class RetrievalOrder
  extends SerializableObject<RetrievalOrderConfig>
  implements DeserializedObject<RetrievalOrderConfig> {
  get config(): Definitions<RetrievalOrderConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<RetrievalOrderConfig>>
      | Partial<DeserializedObject<RetrievalOrderConfig>>
  );
  root: RootCID;
  piece: RootCID;
  size: number;
  total: bigint;
  unsealPrice: bigint;
  paymentInterval: number;
  paymentIntervalIncrease: number;
  client: string;
  miner: string;
  minerPeer: RetrievalPeer;
}
declare type SerializedRetrievalOrder = SerializedObject<RetrievalOrderConfig>;
export { RetrievalOrder, SerializedRetrievalOrder };
