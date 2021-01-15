import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { RetrievalPeer, SerializedRetrievalPeer } from "./retrieval-peer";
import { Miner, SerializedMiner } from "./miner";

type RetrievalOfferConfig = {
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
    minerPeer: {
      type: RetrievalPeer;
      serializedType: SerializedRetrievalPeer;
      serializedName: "MinerPeer";
    };
  };
};

class RetrievalOffer
  extends SerializableObject<RetrievalOfferConfig>
  implements DeserializedObject<RetrievalOfferConfig> {
  get config(): Definitions<RetrievalOfferConfig> {
    return {
      err: {
        serializedName: "Err",
        defaultValue: ""
      },
      root: {
        serializedName: "Root",
        defaultValue: options => new RootCID(options)
      },
      size: {
        serializedName: "Size"
      },
      minPrice: {
        serializedName: "MinPrice"
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
  size: number;
  minPrice: string;
  paymentInterval: number;
  paymentIntervalIncrease: number;
  miner: Miner;
  minerPeer: RetrievalPeer;
}

type SerializedRetrievalOffer = SerializedObject<RetrievalOfferConfig>;

export { RetrievalOffer, SerializedRetrievalOffer };
