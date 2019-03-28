const prefix = "0x";

type Valid = bigint|string|Buffer;

export type IndexableHexData = string & {
  new(value: bigint|string|Buffer): IndexableHexData,
  toString(): string 
}

class BaseHexData<T>  {
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

  public static from(data: bigint|string|Buffer) {
    return new ExportableHexData(data);
  }
  
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

type HexData<T> = BaseHexData<T> & IndexableHexData;
const ExportableHexData = BaseHexData as ({
  new<T extends Valid> (data: T): HexData<T>,
  from<T extends Valid>(data: T): HexData<T>
});
interface ExportableHexData<T=bigint|string|Buffer>   {
  constructor(data: T): ExportableHexData<T>
  toString(): string
  from<T extends bigint|string|Buffer>(): ExportableHexData<T>
}
export default ExportableHexData;
