import { BaseHexData, HexData, IndexableHexData } from ".";

function validateByteLength(byteLength?: number){
  if (byteLength !== undefined && (typeof byteLength !== "number" || byteLength < 0)) {
    throw new Error(`byteLength must be a number greater than 0`);
  }
}
export class BaseJsonRpcData extends BaseHexData {
  private _byteLength: number;
  constructor(value: string | Buffer, byteLength?: number) {
    if (typeof value === "bigint"){
      throw new Error(`Cannot create a ${typeof value} as a JsonRpcData`);
    }
    super(value);
    validateByteLength(byteLength);
    this._byteLength = byteLength | 0;
  }
  public toString(byteLength?: number): string {
    const str = this._str;
    if (str !== undefined) {
      return str;
    } else {
      let str = this._toString();
      let length = str.length;
      if (length % 2 === 1) {
        length++;
        str = `0${str}`;
      }

      if (byteLength !== undefined) {
        validateByteLength(byteLength);
      } else {
        byteLength = this._byteLength;
      }
      if (byteLength !== undefined) {
        const strLength = byteLength * 2;
        const padBy = strLength - length;
        if (padBy < 0) {
          // if our hex-encoded data is longer than it should be, truncate it:
          str = str.slice(0, strLength);
        } else if (padBy > 0) {
          // if our hex-encoded data is shorter than it should be, pad it:
          str = "0".repeat(padBy);
        }
      }
      return `0x${str}`;
    }
  }
  public static from<T extends string|Buffer = string|Buffer>(value: T) {
    return new JsonRpcData(value);
  }
}
type $<T extends string|Buffer = string|Buffer> = {
  new(value: T, byteLength?: number): JsonRpcData & HexData<T>,
  from(value: T): JsonRpcData & HexData<T>,
  toString(byteLength?: number): string
}
const JsonRpcData = BaseJsonRpcData as any as $;

interface JsonRpcData<T = string | Buffer> {
  constructor(value: T, byteLength?: number): JsonRpcData
  from(): JsonRpcData,
  toString(byteLength?: number): string
}

export type IndexableJsonRpcData = JsonRpcData & IndexableHexData;
export default JsonRpcData;
