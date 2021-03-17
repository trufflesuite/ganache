import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { RetrievalPeer, SerializedRetrievalPeer } from "./retrieval-peer";
import { Address, SerializedAddress } from "./address";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/api#QueryOffer

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

class QueryOffer
  extends SerializableObject<QueryOfferConfig>
  implements DeserializedObject<QueryOfferConfig> {
  get config(): Definitions<QueryOfferConfig> {
    return {
      err: {
        deserializedName: "err",
        serializedName: "Err",
        defaultValue: ""
      },
      root: {
        deserializedName: "root",
        serializedName: "Root",
        defaultValue: options => new RootCID(options)
      },
      piece: {
        deserializedName: "piece",
        serializedName: "Piece",
        defaultValue: options => new RootCID(options)
      },
      size: {
        deserializedName: "size",
        serializedName: "Size",
        defaultValue: 0
      },
      minPrice: {
        deserializedName: "minPrice",
        serializedName: "MinPrice",
        defaultValue: literal => (literal ? BigInt(literal) : 0n)
      },
      unsealPrice: {
        deserializedName: "unsealPrice",
        serializedName: "UnsealPrice",
        defaultValue: literal => (literal ? BigInt(literal) : 0n)
      },
      paymentInterval: {
        deserializedName: "paymentInterval",
        serializedName: "PaymentInterval",
        defaultValue: 1048576
      },
      paymentIntervalIncrease: {
        deserializedName: "paymentIntervalIncrease",
        serializedName: "PaymentIntervalIncrease",
        defaultValue: 1048576
      },
      miner: {
        deserializedName: "miner",
        serializedName: "Miner",
        defaultValue: literal =>
          literal ? new Address(literal) : Address.fromId(0, false, true)
      },
      minerPeer: {
        deserializedName: "minerPeer",
        serializedName: "MinerPeer",
        defaultValue: options => new RetrievalPeer(options)
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<QueryOfferConfig>>
      | Partial<DeserializedObject<QueryOfferConfig>>
  ) {
    super();

    this.err = super.initializeValue(this.config.err, options);
    this.root = super.initializeValue(this.config.root, options);
    this.piece = super.initializeValue(this.config.piece, options);
    this.size = super.initializeValue(this.config.size, options);
    this.minPrice = super.initializeValue(this.config.minPrice, options);
    this.unsealPrice = super.initializeValue(this.config.unsealPrice, options);
    this.paymentInterval = super.initializeValue(
      this.config.paymentInterval,
      options
    );
    this.paymentIntervalIncrease = super.initializeValue(
      this.config.paymentIntervalIncrease,
      options
    );
    this.miner = super.initializeValue(this.config.miner, options);
    this.minerPeer = super.initializeValue(this.config.minerPeer, options);
  }

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

type SerializedQueryOffer = SerializedObject<QueryOfferConfig>;

export { QueryOffer, SerializedQueryOffer };
