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
declare class Version
  extends SerializableObject<VersionConfig>
  implements DeserializedObject<VersionConfig> {
  get config(): Definitions<VersionConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<VersionConfig>>
      | Partial<DeserializedObject<VersionConfig>>
  );
  version: string;
  apiVersion: number;
  blockDelay: bigint;
}
declare type SerializedVersion = SerializedObject<VersionConfig>;
export { Version, SerializedVersion };
