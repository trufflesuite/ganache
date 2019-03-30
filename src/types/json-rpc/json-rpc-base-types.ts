export type IndexableJsonRpcType<T extends bigint | string | Buffer = bigint | string | Buffer> = string & {
  new(value: T): IndexableJsonRpcType<T>,
  toString(): string
}

export const strCache = new WeakMap();
export const toStrings = new WeakMap();

const inspect = Symbol.for('nodejs.util.inspect.custom');

export class BaseJsonRpcType<T extends bigint | string | Buffer = bigint | string | Buffer>  {
  protected value: T;
  // used to make console.log debugging a little easier
  private [inspect](depth: number, options: any):T {
    return this.value;
  }
  constructor(value: T) {
    const self = this as any;
    let toString: () => string;
    if (Buffer.isBuffer(value)) {
      toString = value.toString.bind(value, "hex");
      self[Symbol.toStringTag] = "Buffer";
    } else {
      const type = typeof value;
      switch (type) {
        case "bigint":
          toString = value.toString.bind(value, 16);
          break;
        case "string": {
          toString = () => {
            if ((value as string).indexOf("0x") === 0) {
              return (value as string).slice(2);
            } else {
              const buf = Buffer.from(value as string);
              return buf.toString("hex");
            }
          }
          break;
        }
        default:
          throw new Error(`Cannot create a ${typeof value} as a HexData`);
      }
      self[Symbol.toStringTag] = type;
    }

    this.value = value;
    toStrings.set(this, toString);
  }

  toString(): string {
    let str = strCache.get(this);
    if (str === undefined) {
      str = "0x" + toStrings.get(this)();
      strCache.set(this, str);
    }
    return str;
  }
  toBuffer(): Buffer {
    return Buffer.from([]);
  }
  valueOf(): T {
    return this.value;
  }
  toJSON(): string {
    return this.toString()
  }

}

export type JsonRpcType<T extends bigint | string | Buffer> = BaseJsonRpcType<T> & IndexableJsonRpcType<T>;
