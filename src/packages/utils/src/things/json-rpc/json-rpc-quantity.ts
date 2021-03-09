import { bufferToBigInt, BUFFER_EMPTY } from "../../utils";
import { BaseJsonRpcType } from "./json-rpc-base-types";
// TODO(perf): rewrite this stuff since it isn't really caching anything
export class Quantity extends BaseJsonRpcType {
  _nullable: boolean = false;
  public static from(
    value: number | bigint | string | Buffer,
    nullable = false
  ) {
    if (value instanceof Quantity) return value;
    const q = new Quantity(value);
    q._nullable = nullable;
    return q;
  }
  public toString(): string | null {
    // TODO(perf): memoize this stuff
    if (Buffer.isBuffer(this.value)) {
      let val = this.value.toString("hex").replace(/^(?:0+(.+?))?$/, "$1");

      if (val === "") {
        if (this._nullable) {
          return null;
        }
        // RPC Quantities must represent `0` as `0x0`
        return "0x0";
      }
      return `0x${val}`;
    } else if (this.value == null) {
      return "0x";
    } else {
      return super.toString();
    }
  }
  public toBuffer(byteLength: number | null = null): Buffer {
    // 0x0, 0x00, 0x000, etc should return BUFFER_EMPTY
    if (Buffer.isBuffer(this.value)) {
      return this.value;
    } else if (typeof this.value === "string" && byteLength == null) {
      let val = this.value.slice(2).replace(/^(?:0+(.+?))?$/, "$1");
      if (val === "" || val === "0") {
        return BUFFER_EMPTY;
      }
    } else if (this.value === 0 || this.value === 0n) {
      return BUFFER_EMPTY;
    }

    return super.toBuffer();
  }
  public toBigInt(): bigint | null {
    const value = this.value;

    // TODO(perf): memoize this stuff
    if (Buffer.isBuffer(value)) {
      const bigInt = bufferToBigInt(value);
      return bigInt == null ? (this._nullable ? null : 0n) : bigInt;
    } else {
      return value == null ? (this._nullable ? null : 0n) : BigInt(value);
    }
  }
  public toNumber() {
    // TODO(perf): memoize this stuff
    return typeof this.value === "number"
      ? this.value
      : Number(this.toBigInt());
  }
  valueOf(): bigint {
    const value = this.value;
    if (value === null) {
      return value as null;
    } else if (value === undefined) {
      return value as undefined;
    } else {
      return this.toBigInt();
    }
  }
}

export default Quantity;
