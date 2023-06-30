import { Address as EJSAddress } from "@ethereumjs/util";
import { JsonRpcDataInputArg, Data } from "@ganache/utils";

export class Address extends EJSAddress {
  static ByteLength = 20;

  constructor(value: Buffer) {
    super(value);
  }

  public static from<T extends string | Buffer = string | Buffer>(value: T) {
    return new Address(Data.toBuffer(value, Address.ByteLength));
  }

  static toBuffer(value: JsonRpcDataInputArg): Buffer {
    return Address.from(value).toBuffer();
  }

  static toString(value: JsonRpcDataInputArg): string {
    return Address.from(value).toString();
  }

  toJSON() {
    return this.toString();
  }
}
