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
declare type C = RetrievalPeerConfig;
declare class RetrievalPeer
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  address: string;
  id: string;
  pieceCID: RootCID;
}
declare type SerializedRetrievalPeer = SerializedObject<C>;
export { RetrievalPeer, SerializedRetrievalPeer };
