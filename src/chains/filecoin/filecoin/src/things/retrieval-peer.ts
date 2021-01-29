import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { RootCID, SerializedRootCID } from "./root-cid";

// https://pkg.go.dev/github.com/filecoin-project/go-fil-markets@v1.1.1/retrievalmarket#RetrievalPeer

type RetrievalPeerConfig = {
  properties: {
    address: {
      type: string; // using string until we can support more address types in Address
      serializedType: string;
      serializedName: "Address";
    };
    id: {
      type: string;
      serializedType: string;
      serializedName: "ID";
    };
    pieceCID: {
      type: RootCID;
      serializedType: SerializedRootCID;
      serializedName: "PieceCID";
    };
  };
};

type C = RetrievalPeerConfig;

class RetrievalPeer
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C> {
    return {
      address: {
        deserializedName: "address",
        serializedName: "Address",
        defaultValue: "t01000"
      },
      id: {
        deserializedName: "id",
        serializedName: "ID",
        defaultValue: "0"
      },
      pieceCID: {
        deserializedName: "pieceCID",
        serializedName: "PieceCID",
        defaultValue: options => new RootCID(options)
      }
    };
  }

  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  ) {
    super();

    this.address = super.initializeValue(this.config.address, options);
    this.id = super.initializeValue(this.config.id, options);
    this.pieceCID = super.initializeValue(this.config.pieceCID, options);
  }

  address: string;
  id: string;
  pieceCID: RootCID;
}

type SerializedRetrievalPeer = SerializedObject<C>;

export { RetrievalPeer, SerializedRetrievalPeer };
