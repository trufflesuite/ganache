import { CID, SerializedCID } from "./cid";
import {
  SerializableObject,
  DeserializedObject,
  Definitions,
  SerializedObject
} from "./serializable-object";
interface RootCIDConfig {
  properties: {
    "/": {
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
  asPath(): string;
  "/": CID;
}
declare type SerializedRootCID = SerializedObject<RootCIDConfig>;
export { RootCID, SerializedRootCID };
