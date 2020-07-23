import CID from "./cid";
import { SerializableObject, DeserializedObject, Definitions, SerializedObject } from "./serializableobject";

interface RootCIDConfig {
  properties: {
    "/": {
      type: CID,
      serializedType: string,
      serializedName: "/"
    }
  }
}

class RootCID extends SerializableObject<RootCIDConfig> implements DeserializedObject<RootCIDConfig> {
  get config():Definitions<RootCIDConfig> {
    return {
      "/": {
        serializedName: "/",
        defaultValue: (options) => {
          return new CID(options);
        }
      }
    }
  }

  "/": CID;
}

type SerializedRootCID = SerializedObject<RootCIDConfig>;

export {
  RootCID,
  SerializedRootCID
}