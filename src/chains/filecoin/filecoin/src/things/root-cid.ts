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

type C = RootCIDConfig;

class RootCID extends SerializableObject<C> implements DeserializedObject<C> {
  get config(): Definitions<C> {
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
    options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>
  ) {
    super();

    this.root = super.initializeValue(this.config.root, options);
  }

  asPath(): string {
    return "/" + this.root.value;
  }

  root: CID;
}

type SerializedRootCID = SerializedObject<C>;

export { RootCID, SerializedRootCID };
