import { SerializableLiteral, LiteralDefinition, Literal } from "./serializableliteral";

interface CIDConfig {
  type: string;
}

class CID extends SerializableLiteral<CIDConfig>  {
  get config() {
    return {
      defaultValue: (literal) => {
        return literal || CID.createRandomValue();
      }
    }
  };

  // Note! This does not (yet) create a cryptographically valid CID
  static createRandomValue():string {
    let dictionary:string = "abcdefghijklmnopqrstuvwxyz0123456789";

    return "ba" + " ".repeat(60).split("").map(() => {return dictionary[Math.floor(Math.random() * dictionary.length)]}).join("")
  }

  // Note: This does not check for cryptographic validity!
  static isValid(value:string):boolean {
    return value.length == 62 && value.indexOf("ba") == 0
  }
}

export default CID;