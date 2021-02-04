import {
  SerializableObject,
  DeserializedObject,
  SerializedObject,
  Definitions
} from "./serializable-object";
interface VersionConfig {
  properties: {
    version: {
      type: string;
      serializedType: string;
      serializedName: "Version";
    };
    apiVersion: {
      type: number;
      serializedType: number;
      serializedName: "APIVersion";
    };
    blockDelay: {
      type: bigint;
      serializedType: string;
      serializedName: "BlockDelay";
    };
  };
}
declare type C = VersionConfig;
declare class Version
  extends SerializableObject<C>
  implements DeserializedObject<C> {
  get config(): Definitions<C>;
  constructor(
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  );
  version: string;
  apiVersion: number;
  blockDelay: bigint;
}
declare type SerializedVersion = SerializedObject<C>;
export { Version, SerializedVersion };
