import {
  SerializableObject,
  SerializedObject,
  DeserializedObject,
  Definitions
} from "./serializable-object";
declare type FileRefConfig = {
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
declare class FileRef
  extends SerializableObject<FileRefConfig>
  implements DeserializedObject<FileRefConfig> {
  get config(): Definitions<FileRefConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<FileRefConfig>>
      | Partial<DeserializedObject<FileRefConfig>>
  );
  path: string;
  isCAR: boolean;
}
declare type SerializedFileRef = SerializedObject<FileRefConfig>;
export { FileRef, SerializedFileRef };
