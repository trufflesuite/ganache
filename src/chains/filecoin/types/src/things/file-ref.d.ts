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
declare type C = FileRefConfig;
declare class FileRef
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  path: string;
  isCAR: boolean;
}
declare type SerializedFileRef = SerializedObject<C>;
export { FileRef, SerializedFileRef };
