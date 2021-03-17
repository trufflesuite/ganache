import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
import { RootCID, SerializedRootCID } from "./root-cid";
import { Address, SerializedAddress } from "./address";
declare type RetrievalPeerConfig = {
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
declare class RetrievalPeer
  extends SerializableObject<RetrievalPeerConfig>
  implements DeserializedObject<RetrievalPeerConfig> {
  get config(): Definitions<RetrievalPeerConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<RetrievalPeerConfig>>
      | Partial<DeserializedObject<RetrievalPeerConfig>>
  );
  address: Address;
  id: string;
  pieceCID: RootCID;
}
declare type SerializedRetrievalPeer = SerializedObject<RetrievalPeerConfig>;
export { RetrievalPeer, SerializedRetrievalPeer };
