import { RootCID, SerializedRootCID } from "./root-cid";
import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
declare type StorageProposalDataConfig = {
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
declare class StorageProposalData
  extends SerializableObject<StorageProposalDataConfig>
  implements DeserializedObject<StorageProposalDataConfig> {
  get config(): Definitions<StorageProposalDataConfig>;
  transferType: "graphsync";
  root: RootCID;
  pieceCid: null;
  pieceSize: 0;
}
declare type SerializedStorageProposalData = SerializedObject<StorageProposalDataConfig>;
export { StorageProposalData, SerializedStorageProposalData };
