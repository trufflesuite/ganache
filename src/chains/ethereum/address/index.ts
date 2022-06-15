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
}
