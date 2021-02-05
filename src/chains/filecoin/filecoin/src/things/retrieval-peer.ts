import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { RootCID, SerializedRootCID } from "./root-cid";
import { Address, SerializedAddress } from "./address";

// https://pkg.go.dev/github.com/filecoin-project/go-fil-markets@v1.1.1/retrievalmarket#RetrievalPeer

type RetrievalPeerConfig = {
  properties: {
    address: {
      type: Address;
      serializedType: SerializedAddress;
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

class RetrievalPeer
  extends SerializableObject<RetrievalPeerConfig>
  implements DeserializedObject<RetrievalPeerConfig> {
  get config(): Definitions<RetrievalPeerConfig> {
    return {
      address: {
        deserializedName: "address",
        serializedName: "Address",
        defaultValue: literal =>
          literal ? new Address(literal) : Address.fromId(0, false, true)
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
    options?:
      | Partial<SerializedObject<RetrievalPeerConfig>>
      | Partial<DeserializedObject<RetrievalPeerConfig>>
  ) {
    super();

    this.address = super.initializeValue(this.config.address, options);
    this.id = super.initializeValue(this.config.id, options);
    this.pieceCID = super.initializeValue(this.config.pieceCID, options);
  }

  address: Address;
  id: string;
  pieceCID: RootCID;
}

type SerializedRetrievalPeer = SerializedObject<RetrievalPeerConfig>;

export { RetrievalPeer, SerializedRetrievalPeer };
