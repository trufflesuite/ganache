import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/api#FileRef

type FileRefConfig = {
  properties: {
    path: {
      type: string;
      serializedType: string;
      serializedName: "Path";
    };
    isCAR: {
      type: boolean;
      serializedType: boolean;
      serializedName: "IsCAR";
    };
  };
};

class FileRef
  extends SerializableObject<FileRefConfig>
  implements DeserializedObject<FileRefConfig> {
  get config(): Definitions<FileRefConfig> {
    return {
      path: {
        serializedName: "Path",
        defaultValue: ""
      },
      isCAR: {
        serializedName: "IsCAR",
        defaultValue: false
      }
    };
  }

  path: string;
  isCAR: boolean;
}

type SerializedFileRef = SerializedObject<FileRefConfig>;

export { FileRef, SerializedFileRef };
