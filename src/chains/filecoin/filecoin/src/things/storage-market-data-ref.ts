import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/go-fil-markets@v1.1.1/storagemarket#DataRef

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

class StorageMarketDataRef
  extends SerializableObject<StorageMarketDataRefConfig>
  implements DeserializedObject<StorageMarketDataRefConfig> {
  get config(): Definitions<StorageMarketDataRefConfig> {
    return {
      transferType: {
        deserializedName: "transferType",
        serializedName: "TransferType",
        defaultValue: "graphsync"
      },
      root: {
        deserializedName: "root",
        serializedName: "Root",
        defaultValue: options => new RootCID(options)
      },
      pieceCid: {
        deserializedName: "pieceCid",
        serializedName: "PieceCid",
        defaultValue: options =>
          new RootCID(
            options || {
              "/": "Piece CIDs are not supported in Ganache"
            }
          )
      },
      pieceSize: {
        deserializedName: "pieceSize",
        serializedName: "PieceSize",
        defaultValue: 0
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<StorageMarketDataRefConfig>>
      | Partial<DeserializedObject<StorageMarketDataRefConfig>>
  ) {
    super();

    this.transferType = super.initializeValue(
      this.config.transferType,
      options
    );
    this.root = super.initializeValue(this.config.root, options);
    this.pieceCid = super.initializeValue(this.config.pieceCid, options);
    this.pieceSize = super.initializeValue(this.config.pieceSize, options);
  }

  transferType: "graphsync";
  root: RootCID;
  pieceCid: RootCID | null;
  pieceSize: number;
}

type SerializedStorageMarketDataRef = SerializedObject<StorageMarketDataRefConfig>;

export { StorageMarketDataRef, SerializedStorageMarketDataRef };
