export type IndexableJsonRpcType<T extends bigint|string|Buffer = bigint|string|Buffer> = string & {
    new(value: T): IndexableJsonRpcType<T>,
    toString(): string 
  }
  
  export class BaseJsonRpcType<T extends bigint|string|Buffer = bigint|string|Buffer>  {
    protected _value: T;
    protected _str: string;
    protected _toString: () => string
    constructor(value: T) {
      if (Buffer.isBuffer(value)) {
        this._toString = value.toString.bind(value, "hex");
      } else {
        switch (typeof value) {
          case "bigint":
            this._toString = value.toString.bind(value, 16);
            break;
          case "string": {
            this._toString = () => {
              if (value.indexOf("0x") === 0) {
                return this._str = value as string;
              } else {
                const buf = Buffer.from(value);
                return buf.toString("hex");
              }
            }
            break;
          }
          default:
            throw new Error(`Cannot create a ${typeof value} as a HexData`);
        }
      }
      this._value = value;
    }
  
    // public static from<T extends bigint|string|Buffer = bigint|string|Buffer>(value: T) {
    //   return new BaseJsonRpcType<T>(value);
    // }
    
    toString(): string {
      return this._toString()
    }
    toBuffer(): Buffer {
      return Buffer.from([]);
    }
    valueOf():T {
      return this._value;
    }
  }
  
  export type JsonRpcType<T extends bigint|string|Buffer> = BaseJsonRpcType<T> & IndexableJsonRpcType<T>;
  