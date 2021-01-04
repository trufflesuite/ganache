import { RootCID, SerializedRootCID } from "./root-cid";
import { Miner, SerializedMiner } from "./miner";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";

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
    minerPeerId: {
      type: string;
      serializedType: string;
      serializedName: "MinerPeerID";
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
      minerPeerId: {
        serializedName: "MinerPeerID",
        defaultValue: options => {
          let alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
          return " "
            .repeat(52)
            .split("")
            .map(() => alphabet[Math.floor(Math.random() * alphabet.length)])
            .join("");
        }
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
  minerPeerId: string;
}

type SerializedRetrievalOffer = SerializedObject<RetrievalOfferConfig>;

export { RetrievalOffer, SerializedRetrievalOffer };
