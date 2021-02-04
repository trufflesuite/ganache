import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
declare type StorageMarketDataRefConfig = {
  properties: {
    transferType: {
      type: "graphsync";
      serializedType: "graphsync";
      serializedName: "TransferType";
    };
    root: {
      type: RootCID;
      serializedType: SerializedRootCID;
      serializedName: "Root";
    };
    pieceCid: {
      type: RootCID | null;
      serializedType: SerializedRootCID | null;
      serializedName: "PieceCid";
    };
    pieceSize: {
      type: 0;
      serializedType: 0;
      serializedName: "PieceSize";
    };
  };
};
declare type C = StorageMarketDataRefConfig;
declare class StorageMarketDataRef
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  transferType: "graphsync";
  root: RootCID;
  pieceCid: RootCID | null;
  pieceSize: 0;
}
declare type SerializedStorageMarketDataRef = SerializedObject<C>;
export { StorageMarketDataRef, SerializedStorageMarketDataRef };
