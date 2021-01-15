import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { CID, SerializedCID } from "./cid";

// https://pkg.go.dev/github.com/filecoin-project/go-fil-markets/retrievalmarket#RetrievalPeer

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
      type: CID;
      serializedType: SerializedCID;
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
        serializedName: "Address",
        defaultValue: "t01000"
      },
      id: {
        serializedName: "ID",
        defaultValue: "0"
      },
      pieceCID: {
        serializedName: "PieceCID",
        defaultValue: options =>
          new CID(options || "Piece CIDs are not supported in Ganache")
      }
    };
  }

  address: string;
  id: string;
  pieceCID: CID;
}

type SerializedRetrievalPeer = SerializedObject<RetrievalPeerConfig>;

export { RetrievalPeer, SerializedRetrievalPeer };
