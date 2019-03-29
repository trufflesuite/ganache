const prefix = "0x";

import IndexableHexData from "./indexable-hex-data"
export type IndexableHexData<T> = IndexableHexData<T>;

export class BaseHexData<T> {
  private _data: T;
  private _str: string;
  private _toString: () => string
  constructor(data: T) {
    if (Buffer.isBuffer(data)) {
      this._toString = data.toString.bind(data, "hex");
    } else {
      switch (typeof data) {
        case "bigint":
          this._toString = data.toString.bind(data, 16);
          break;
        case "string": {
          if (data.indexOf("0x") === 0) {
            this._str = data as string;
          } else {
            this._toString = () => {
              const buf = Buffer.from(data);
              return buf.toString("hex");
            }
          }
          break;
        }
        default:
          throw new Error(`Cannot create a ${typeof data} as a HexData`);
      }
    }
    this._data = data;
  }

  public static from: (data: bigint|string|Buffer) => BaseHexData<bigint|string|Buffer>;
  
  toString(): string {
    const str = this._str;
    if (str !== undefined) {
      return str;
    } else {
      return this._str = (prefix + this._toString());
    }
  }
  valueOf():T {
    return this._data;
  }
}

export type HexData<T> = BaseHexData<T> & IndexableHexData<T>;