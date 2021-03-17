import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { RetrievalPeer, SerializedRetrievalPeer } from "./retrieval-peer";
import { Address, SerializedAddress } from "./address";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/api#RetrievalOrder

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
      type: Address;
      serializedType: SerializedAddress;
      serializedName: "Client";
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

class RetrievalOrder
  extends SerializableObject<RetrievalOrderConfig>
  implements DeserializedObject<RetrievalOrderConfig> {
  get config(): Definitions<RetrievalOrderConfig> {
    return {
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
      total: {
        deserializedName: "total",
        serializedName: "Total",
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
      client: {
        deserializedName: "client",
        serializedName: "Client",
        defaultValue: literal =>
          literal ? new Address(literal) : Address.fromId(0)
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
      | Partial<SerializedObject<RetrievalOrderConfig>>
      | Partial<DeserializedObject<RetrievalOrderConfig>>
  ) {
    super();

    this.root = super.initializeValue(this.config.root, options);
    this.piece = super.initializeValue(this.config.piece, options);
    this.size = super.initializeValue(this.config.size, options);
    this.total = super.initializeValue(this.config.total, options);
    this.unsealPrice = super.initializeValue(this.config.unsealPrice, options);
    this.paymentInterval = super.initializeValue(
      this.config.paymentInterval,
      options
    );
    this.paymentIntervalIncrease = super.initializeValue(
      this.config.paymentIntervalIncrease,
      options
    );
    this.client = super.initializeValue(this.config.client, options);
    this.miner = super.initializeValue(this.config.miner, options);
    this.minerPeer = super.initializeValue(this.config.minerPeer, options);
  }

  root: RootCID;
  piece: RootCID;
  size: number;
  total: bigint;
  unsealPrice: bigint;
  paymentInterval: number;
  paymentIntervalIncrease: number;
  client: Address;
  miner: Address;
  minerPeer: RetrievalPeer;
}

type SerializedRetrievalOrder = SerializedObject<RetrievalOrderConfig>;

export { RetrievalOrder, SerializedRetrievalOrder };
