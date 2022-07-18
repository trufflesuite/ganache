import { Data, JsonRpcDataInputArg } from "@ganache/utils";

export class Address extends Data {
  static ByteLength = 20;

  constructor(value: string | Buffer) {
    super(value, Address.ByteLength);
  }

  public static from<T extends string | Buffer = string | Buffer>(value: T) {
    return new Address(value);
  }

  static toBuffer(value: JsonRpcDataInputArg): Buffer {
    return Address.from(value).toBuffer();
  }

  static toString(value: JsonRpcDataInputArg): string {
    return Address.from(value).toString();
  }

  /**
   * Validates the input by converting to a string and throwing if:
   *  1. The string isn't prefixed with "0x".
   *  2. The string contains non-hex characters.
   *  3. The byte length of the string doesn't match 20, the valid length of an address.
   * @param value The string or buffer to validate.
   */
  static validateAddress(value: JsonRpcDataInputArg) {
    Data.validateHexString(value, Address.ByteLength);
  }
}
