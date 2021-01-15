import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { RetrievalPeer, SerializedRetrievalPeer } from "./retrieval-peer";

// https://pkg.go.dev/github.com/filecoin-project/lotus/api#QueryOffer

type QueryOfferConfig = {
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
      type: string; // using string until we can support more address types in Address
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

class QueryOffer
  extends SerializableObject<QueryOfferConfig>
  implements DeserializedObject<QueryOfferConfig> {
  get config(): Definitions<QueryOfferConfig> {
    return {
      err: {
        serializedName: "Err",
        defaultValue: ""
      },
      root: {
        serializedName: "Root",
        defaultValue: options => new RootCID(options)
      },
      piece: {
        serializedName: "Piece",
        defaultValue: options => new RootCID(options)
      },
      size: {
        serializedName: "Size"
      },
      minPrice: {
        serializedName: "MinPrice"
      },
      unsealPrice: {
        serializedName: "UnsealPrice"
      },
      paymentInterval: {
        serializedName: "PaymentInterval",
        defaultValue: 1048576
      },
      paymentIntervalIncrease: {
        serializedName: "PaymentIntervalIncrease",
        defaultValue: 1048576
      },
      miner: {
        serializedName: "Miner"
      },
      minerPeer: {
        serializedName: "MinerPeer",
        defaultValue: options => new RetrievalPeer(options)
      }
    };
  }

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

type SerializedQueryOffer = SerializedObject<QueryOfferConfig>;

export { QueryOffer, SerializedQueryOffer };
