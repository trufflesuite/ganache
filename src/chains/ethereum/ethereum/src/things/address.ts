import { Data } from "@ganache/utils";

class Address extends Data {
  /**
   *
   * @param value
   * @param byteLength the exact length the value represents when encoded as
   * Ethereum JSON-RPC DATA.
   */
  constructor(value: string | Buffer, byteLength: number = 20) {
    super(value, byteLength);
  }
}

export default Address;
