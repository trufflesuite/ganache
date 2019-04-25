import { BaseJsonRpcType, JsonRpcType, IndexableJsonRpcType } from ".";
import { bufferToHex } from "ethereumjs-util";
import { isBigIntLiteral } from "typescript";

class JsonRpcQuantity extends BaseJsonRpcType {
  public static from(value: number | bigint | string | Buffer) {
    return new _JsonRpcQuantity(value);
  }
  public toBigInt(): bigint {
    const value = this.value;

    // TODO: memoize this stuff
    if (Buffer.isBuffer(value)) {
      // Parsed as BE.

      // This doesn't handle negative values. We may need to add logic to handle
      // it because it is possible values returned from the VM could be negative
      // and stored in a buffer.


      const length = value.byteLength;
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
        // TODO: handle bigint's stored as Buffers that are this big?
        // It's not too hard.
        throw new Error(`Cannot convert Buffer of length ${length} to bigint!`);
      }
      return view.getBigUint64(0) as bigint;
    } else {
      return BigInt(this.value);
    }
  }
  valueOf(): bigint {
    return this.toBigInt();
  }
}
type $<T extends number|bigint|string|Buffer = number|bigint|string|Buffer> = {
  new(value: T): _JsonRpcQuantity & JsonRpcType<T>,
  from(value: T): _JsonRpcQuantity & JsonRpcType<T>,
  toBigInt(): bigint,
  toBuffer(): Buffer
}
const _JsonRpcQuantity = JsonRpcQuantity as $;

interface _JsonRpcQuantity<T = number | bigint | string | Buffer> {
  constructor(value: T): _JsonRpcQuantity
  from(): _JsonRpcQuantity,
  toBigInt(): bigint,
  toBuffer(): Buffer
}

export type IndexableJsonRpcQuantity = _JsonRpcQuantity & IndexableJsonRpcType;
export default _JsonRpcQuantity;
