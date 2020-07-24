import { SerializableLiteral } from "./serializableliteral";

interface AddressConfig {
  type: string;
}

class Address extends SerializableLiteral<AddressConfig>  {
  get config() {
    return {
      defaultValue: (literal) => {
        return literal || Address.createRandomValue();
      }
    }
  };

  // Note! This does not (yet) create a cryptographically valid address
  static createRandomValue():string {
    let dictionary:string = "abcdefghijklmnopqrstuvwxyz0123456789";

    return "t3" + " ".repeat(84).split("").map(() => {return dictionary[Math.floor(Math.random() * dictionary.length)]}).join("")
  }

  // Note: This does not (yet) check for cryptographic validity!
  static isValid(value:string):boolean {
    return value.length == 86 && value.indexOf("t3") == 0
  }
}

export default Address;