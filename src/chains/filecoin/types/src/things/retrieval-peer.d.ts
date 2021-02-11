import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { RootCID, SerializedRootCID } from "./root-cid";
declare type RetrievalPeerConfig = {
  properties: {
    address: {
      type: string;
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
declare class RetrievalPeer
  extends SerializableObject<RetrievalPeerConfig>
  implements DeserializedObject<RetrievalPeerConfig> {
  get config(): Definitions<RetrievalPeerConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<RetrievalPeerConfig>>
      | Partial<DeserializedObject<RetrievalPeerConfig>>
  );
  address: string;
  id: string;
  pieceCID: RootCID;
}
declare type SerializedRetrievalPeer = SerializedObject<RetrievalPeerConfig>;
export { RetrievalPeer, SerializedRetrievalPeer };
