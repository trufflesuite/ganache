import { CID, SerializedCID } from "./cid";
import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
interface RootCIDConfig {
  properties: {
    root: {
      type: CID;
      serializedType: SerializedCID;
      serializedName: "/";
    };
  };
}
declare class RootCID
  extends SerializableObject<RootCIDConfig>
  implements DeserializedObject<RootCIDConfig> {
  get config(): Definitions<RootCIDConfig>;
  constructor(
    options?:
      | Partial<SerializedObject<RootCIDConfig>>
      | Partial<DeserializedObject<RootCIDConfig>>
  );
  asPath(): string;
  root: CID;
}
declare type SerializedRootCID = SerializedObject<RootCIDConfig>;
export { RootCID, SerializedRootCID };
