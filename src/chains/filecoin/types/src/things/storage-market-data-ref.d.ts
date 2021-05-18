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
      type: number;
      serializedType: number;
      serializedName: "PieceSize";
    };
  };
};
declare class StorageMarketDataRef
  extends SerializableObject<StorageMarketDataRefConfig>
  implements DeserializedObject<StorageMarketDataRefConfig> {
  get config(): Definitions<StorageMarketDataRefConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<StorageMarketDataRefConfig>>
      | Partial<DeserializedObject<StorageMarketDataRefConfig>>
  );
  transferType: "graphsync";
  root: RootCID;
  pieceCid: RootCID | null;
  pieceSize: number;
}
declare type SerializedStorageMarketDataRef = SerializedObject<StorageMarketDataRefConfig>;
export { StorageMarketDataRef, SerializedStorageMarketDataRef };
