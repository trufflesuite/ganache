import { BaseJsonRpcType } from "./json-rpc-base-types";
import { toBigIntBE } from "bigint-buffer";

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
      // Parsed as BE.

      // This doesn't handle negative values. We may need to add logic to handle
      // it because it is possible values returned from the VM could be negative
      // and stored in a buffer.

      const length = value.byteLength;
      if (length === 0) {
        return null;
      }
      // Buffers that are 6 bytes or less can be converted with built-in methods
      if (length <= 6) {
        return BigInt(value.readUIntBE(0, length));
      }

      let view: DataView;
      // Buffers that are 7 bytes need to be padded to 8 bytes
      if (length === 7) {
        const padded = new Uint8Array(8);
        // set byte 0 to 0, and bytes 1-8 to the value's 7 bytes:
        padded.set(value, 1);
        view = new DataView(padded.buffer);
      } else if (length === 8) {
        view = new DataView(value.buffer, value.byteOffset, length);
      } else {
        // TODO: toBigIntBE is a native lib with no pure JS fallback yet.
        return toBigIntBE(value);
        // TODO: handle bigint's stored as Buffers that are this big?
        // It's not too hard.
        // throw new Error(`Cannot convert Buffer of length ${length} to bigint!`);
      }
      return view.getBigUint64(0) as bigint;
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
