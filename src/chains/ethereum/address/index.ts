import { Address as EJSAddress, isValidAddress } from "@ethereumjs/util";
import { BUFFER_EMPTY, JsonRpcDataInputArg, Quantity } from "@ganache/utils";

export class Address extends EJSAddress {
  public static Empty = Address.from(BUFFER_EMPTY);
  static ByteLength = 20;

  constructor(value: Buffer) {
    super(value);
  }

  public isNull() {
    return this.buf == null;
  }

  public static from<T extends string | Buffer = string | Buffer>(value: T) {
    if (typeof value === "string") {
      if (!isValidAddress(value)) {
        throw new Error("Invalid address");
      }
      return new Address(Quantity.toBuffer(value));
    }
    return new Address(value);
  }

  static toBuffer(value: JsonRpcDataInputArg): Buffer {
    return Address.from(value).toBuffer();
  }

  static toString(value: JsonRpcDataInputArg): string {
    return Address.from(value).toString();
  }
}
