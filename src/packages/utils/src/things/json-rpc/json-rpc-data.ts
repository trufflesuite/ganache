import { BaseJsonRpcType } from "./json-rpc-base-types";
import { strCache, toStrings } from "./json-rpc-base-types";

function validateByteLength(byteLength?: number) {
  if (typeof byteLength !== "number" || !(byteLength >= 0)) {
    throw new Error(`byteLength must be a number greater than or equal to 0, provided: ${byteLength}`);
  }
}

export class Data extends BaseJsonRpcType {

  constructor(value: string | Buffer, private _byteLength?: number) {
    super(value);
    if (typeof value === "bigint") {
      throw new Error(`Cannot create a ${typeof value} as a Data`);
    }
    if (_byteLength !== undefined) {
      validateByteLength(_byteLength);
    }
  }
  public toString(byteLength?: number): string {
    if (byteLength === undefined) {
      byteLength = this._byteLength;
    }
    if (byteLength === undefined && strCache.has(this)) {
      return strCache.get(this) as string;
    } else {
      let str = toStrings.get(this)() as string;
      let length = str.length;

      if (length % 2 === 1) {
        length++;
        str = `0${str}`;
      }

      if (byteLength !== undefined) {
        validateByteLength(byteLength);
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
  public static from<T extends string | Buffer = string | Buffer>(
    value: T,
    byteLength?: number
  ) {
    return new Data(value, byteLength);
  }
}
