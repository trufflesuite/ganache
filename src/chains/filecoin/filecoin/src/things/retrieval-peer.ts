import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { CID, SerializedCID } from "./cid";
import { Miner, SerializedMiner } from "./miner";

type RetrievalPeerConfig = {
  properties: {
    address: {
      type: Miner;
      serializedType: SerializedMiner;
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
        defaultValue: options => new Miner(options)
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

  address: Miner;
  id: string;
  pieceCID: CID;
}

type SerializedRetrievalPeer = SerializedObject<RetrievalPeerConfig>;

export { RetrievalPeer, SerializedRetrievalPeer };
