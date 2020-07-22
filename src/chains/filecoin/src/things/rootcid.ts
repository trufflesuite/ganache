import CID from "./cid";
import { SerializableObject } from "./serializableobject";

interface RootCIDParameters {
  "/": CID;
}

interface SerializedRootCIDParameters {
  "/": CID; 
}

class RootCID extends SerializableObject<RootCIDParameters, SerializedRootCIDParameters> {
  defaults(options:SerializedRootCIDParameters):RootCIDParameters {
    return {
      "/": new CID(options["/"])
    }
  }
  keyMapping():Record<keyof RootCIDParameters, keyof SerializedRootCIDParameters> {
    return {
      "/":"/"
    }
  }
}

export {
  RootCID,
  RootCIDParameters,
  SerializedRootCIDParameters
}