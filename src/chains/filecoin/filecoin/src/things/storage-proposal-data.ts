import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";

type StorageProposalDataConfig = {
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
      type: RootCID;
      serializedType: SerializedRootCID;
      serializedName: "PieceCid";
    };
    pieceSize: {
      type: number;
      serializedType: number;
      serializedName: "PieceSize";
    };
  };
};

class StorageProposalData
  extends SerializableObject<StorageProposalDataConfig>
  implements DeserializedObject<StorageProposalDataConfig> {
  get config(): Definitions<StorageProposalDataConfig> {
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
        defaultValue: options =>
          new RootCID(
            options || {
              "/": "Piece CIDs are not supported in Ganache"
            }
          )
      },
      pieceSize: {
        serializedName: "PieceSize",
        defaultValue: 0
      }
    };
  }

  transferType: "graphsync";
  root: RootCID;
  pieceCid: RootCID;
  pieceSize: number;
}

type SerializedStorageProposalData = SerializedObject<
  StorageProposalDataConfig
>;

export { StorageProposalData, SerializedStorageProposalData };
