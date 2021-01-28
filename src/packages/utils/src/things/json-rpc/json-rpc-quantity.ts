import { bufferToBigInt } from "../../utils";
import { BaseJsonRpcType } from "./json-rpc-base-types";
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
    if (Buffer.isBuffer(this.value)) {
      let val = this.value.toString("hex").replace(/^(?:0+(.+?))?$/, "$1");

      if (val === "") {
        if (this._nullable) {
          return null;
        }
        // RPC Quantities must represent `0` as `0x0`
        val = "0";
      }
      return "0x" + val;
    } else {
      return super.toString();
    }
  }
  public toBigInt(): bigint | null {
    const value = this.value;

    // TODO(perf): memoize this stuff
    if (Buffer.isBuffer(value)) {
      return bufferToBigInt(value);
    } else {
      return value != null ? BigInt(value) : 0n;
    }
  }
  public toNumber() {
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
