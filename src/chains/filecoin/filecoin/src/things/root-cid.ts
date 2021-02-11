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

class RootCID
  extends SerializableObject<RootCIDConfig>
  implements DeserializedObject<RootCIDConfig> {
  get config(): Definitions<RootCIDConfig> {
    return {
      root: {
        deserializedName: "root",
        serializedName: "/",
        defaultValue: options => {
          return options ? new CID(options) : CID.nullCID();
        }
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<RootCIDConfig>>
      | Partial<DeserializedObject<RootCIDConfig>>
  ) {
    super();

    this.root = super.initializeValue(this.config.root, options);
  }

  asPath(): string {
    return "/" + this.root.value;
  }

  root: CID;
}

type SerializedRootCID = SerializedObject<RootCIDConfig>;

export { RootCID, SerializedRootCID };
