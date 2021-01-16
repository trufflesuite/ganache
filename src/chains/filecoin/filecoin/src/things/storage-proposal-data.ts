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

type SerializedStorageProposalData = SerializedObject<
  StorageProposalDataConfig
>;

export { StorageProposalData, SerializedStorageProposalData };
