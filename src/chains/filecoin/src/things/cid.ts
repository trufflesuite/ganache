import { SerializableLiteral } from "./serializableliteral";

interface CIDConfig {
  type: string;
}

class CID extends SerializableLiteral<CIDConfig>  {
  get config() {
    return {
      defaultValue: (literal) => {
        if (typeof literal == undefined) {
          throw new Error("CID must be passed a value!")
        }  

        return literal 
      }
    }
  };

  // Note: This does not (yet) check for cryptographic validity!
  static isValid(value:string):boolean {
    return value.length >= 59 && value.indexOf("ba") == 0
  }
}

type SerializedCID = string;

export {
  CID,
  SerializedCID
};