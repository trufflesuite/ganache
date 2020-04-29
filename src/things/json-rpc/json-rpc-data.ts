import {BaseJsonRpcType, JsonRpcType, IndexableJsonRpcType} from ".";
import {strCache, toStrings} from "./json-rpc-base-types";

function validateByteLength(byteLength?: number) {
  if (typeof byteLength !== "number" || byteLength < 0) {
    throw new Error(`byteLength must be a number greater than 0`);
  }
}
const byteLengths = new WeakMap();
export class Data extends BaseJsonRpcType {
  constructor(value: string | Buffer, byteLength?: number) {
    if (typeof value === "bigint") {
      throw new Error(`Cannot create a ${typeof value} as a Data`);
    }
    super(value);
    if (byteLength !== undefined) {
      validateByteLength(byteLength);
      byteLengths.set(this, byteLength | 0);
    }
  }
  public toString(byteLength?: number): string {
    const str = strCache.get(this) as string;
    if (str !== undefined) {
      return str;
    } else {
      let str = toStrings.get(this)() as string;
      let length = str.length;
      if (length % 2 === 1) {
        length++;
        str = `0${str}`;
      }

      if (byteLength !== undefined) {
        validateByteLength(byteLength);
      } else {
        byteLength = byteLengths.get(this);
      }
      if (byteLength !== undefined) {
        const strLength = byteLength * 2;
        const padBy = strLength - length;
        if (padBy < 0) {
          // if our hex-encoded data is longer than it should be, truncate it:
          str = str.slice(0, strLength);
        } else if (padBy > 0) {
          // if our hex-encoded data is shorter than it should be, pad it:
          str = "0".repeat(padBy) + str;
        }
      }
      return `0x${str}`;
    }
  }
  public static from<T extends string | Buffer = string | Buffer>(value: T, byteLength?: number) {
    return new _Data(value, byteLength);
  }
}
type $<T extends string | Buffer = string | Buffer> = {
  new (value: T, byteLength?: number): _Data<T> & JsonRpcType<T>;
  from(value: T, byteLength?: number): _Data<T> & JsonRpcType<T>;
  toString(byteLength?: number): string;
  toBuffer(): Buffer;
};
const _Data = Data as $;

interface _Data<T extends string | Buffer = string | Buffer> {
  constructor(value: T, byteLength?: number): _Data;
  from(value: T, byteLength?: number): _Data;
  toString(byteLength?: number): string;
  toBuffer(): Buffer;
}

export type IndexableData = _Data & IndexableJsonRpcType;
export default _Data;
