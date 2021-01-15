import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/go-fil-markets/storagemarket#DataRef

type StorageMarketDataRefConfig = {
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
      type: null;
      serializedType: null;
      serializedName: "PieceCid";
    };
    pieceSize: {
      type: 0;
      serializedType: 0;
      serializedName: "PieceSize";
    };
  };
};

class StorageMarketDataRef
  extends SerializableObject<StorageMarketDataRefConfig>
  implements DeserializedObject<StorageMarketDataRefConfig> {
  get config(): Definitions<StorageMarketDataRefConfig> {
    return {
      transferType: {
        serializedName: "TransferType",
        defaultValue: "graphsync"
      },
      root: {
        serializedName: "Root",
        defaultValue: options => new RootCID(options)
      },
      pieceCid: {
        serializedName: "PieceCid",
        defaultValue: null
      },
      pieceSize: {
        serializedName: "PieceSize",
        defaultValue: 0
      }
    };
  }

  transferType: "graphsync";
  root: RootCID;
  pieceCid: null;
  pieceSize: 0;
}

type SerializedStorageMarketDataRef = SerializedObject<StorageMarketDataRefConfig>;

export { StorageMarketDataRef, SerializedStorageMarketDataRef };
