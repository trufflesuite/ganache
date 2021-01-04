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

class RootCID
  extends SerializableObject<RootCIDConfig>
  implements DeserializedObject<RootCIDConfig> {
  get config(): Definitions<RootCIDConfig> {
    return {
      "/": {
        serializedName: "/",
        defaultValue: options => {
          return new CID(options);
        }
      }
    };
  }

  asPath(): string {
    return "/" + this["/"].value;
  }

  "/": CID;
}

type SerializedRootCID = SerializedObject<RootCIDConfig>;

export { RootCID, SerializedRootCID };
