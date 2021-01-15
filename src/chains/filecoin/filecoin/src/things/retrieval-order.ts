import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { RetrievalPeer, SerializedRetrievalPeer } from "./retrieval-peer";

// https://pkg.go.dev/github.com/filecoin-project/lotus/api#RetrievalOrder

type RetrievalOrderConfig = {
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
      type: string; // using string until we can support more address types in Address
      serializedType: string;
      serializedName: "Client";
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

class RetrievalOrder
  extends SerializableObject<RetrievalOrderConfig>
  implements DeserializedObject<RetrievalOrderConfig> {
  get config(): Definitions<RetrievalOrderConfig> {
    return {
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
      total: {
        serializedName: "Total"
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
      client: {
        serializedName: "Client",
        defaultValue: "t02000"
      },
      miner: {
        serializedName: "Miner",
        defaultValue: "t01000"
      },
      minerPeer: {
        serializedName: "MinerPeer",
        defaultValue: options => new RetrievalPeer(options)
      }
    };
  }

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

type SerializedRetrievalOrder = SerializedObject<RetrievalOrderConfig>;

export { RetrievalOrder, SerializedRetrievalOrder };
