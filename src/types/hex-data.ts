const prefix = "0x";

export type IndexableHexData = string & {
  new(value: bigint|string|Buffer): IndexableHexData,
  toString(): string 
}

class BaseHexData<T>  {
  protected _data: T;
  protected _str: string;
  protected _toString: () => string
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
    return new BaseHexData(data);
  }
  
  toString(): string {
    return this._toString()
  }
  toBuffer(): Buffer {

  }
  valueOf():T {
    return this._data;
  }
}

type HexData<T> = BaseHexData<T> & IndexableHexData;






class _JsonRpcData<T> extends BaseHexData<T> {
  public toString(): string {
    const str = this._str;
    if (str !== undefined) {
      return str;
    } else {
      const str = this._toString();
      if (str.length % 2 === 1) {
        return this._str = `0x0${str}`;
      } else {
        return this._str = `0x${str}`;
      }
    }
  }
  public static from(data: bigint|string|Buffer) {
    return new JsonRpcData(data);
  }
}
const JsonRpcData = _JsonRpcData as ({
  new<T extends bigint|string|Buffer> (data: T): JsonRpcData & HexData<T>,
  from<T extends bigint|string|Buffer>(data: T): JsonRpcData & HexData<T>
});

export interface JsonRpcData<T=bigint|string|Buffer> {
  constructor(data: T): JsonRpcData<T>
  from<T extends bigint|string|Buffer>(): JsonRpcData<T>
}


// quantity
class _JsonRpcQuantity<T> extends BaseHexData<T> {
  public toString(): string {
    const str = this._str;
    if (str !== undefined) {
      return str;
    } else {
      return this._str = (prefix + this._toString());
    }
  }
  public static from(data: bigint|string|Buffer) {
    return new JsonRpcQuantity(data);
  }
}

const JsonRpcQuantity = _JsonRpcQuantity as ({
  new<T extends bigint|string|Buffer> (data: T): JsonRpcQuantity & HexData<T>,
  from<T extends bigint|string|Buffer>(data: T): JsonRpcQuantity & HexData<T>
});
interface JsonRpcQuantity<T extends bigint|string|Buffer = bigint|string|Buffer> extends string {
  constructor(data: T): JsonRpcQuantity<T>
  from<T extends bigint|string|Buffer>(): JsonRpcQuantity<T>
}


export {JsonRpcQuantity, JsonRpcData};


class AccountManager {
  [index: string]: string;
}
var a = new AccountManager();
var q: JsonRpcQuantity = new JsonRpcQuantity("123");
a[q] = "123";

console.log(balance.toString());
console.log(balance.valueOf());