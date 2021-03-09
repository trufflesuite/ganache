import { Data } from "@ganache/utils";

export class Address extends Data {
  static ByteLength = 20;

  /**
   *
   * @param value
   * @param byteLength the exact length the value represents when encoded as
   * Ethereum JSON-RPC DATA.
   */
  constructor(value: string | Buffer) {
    super(value, Address.ByteLength);
  }
  public static from<T extends string | Buffer = string | Buffer>(value: T) {
    return new Address(value);
  }
}
