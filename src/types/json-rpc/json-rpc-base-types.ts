export type IndexableJsonRpcType<T extends number | bigint | string | Buffer = number | bigint | string | Buffer> = string & {
  new(value: T): IndexableJsonRpcType<T>,
  toString(): string
}

export const strCache = new WeakMap();
export const bufCache = new WeakMap();
export const toStrings = new WeakMap();
export const toBuffers = new WeakMap();

const inspect = Symbol.for('nodejs.util.inspect.custom');

export class BaseJsonRpcType<T extends number | bigint | string | Buffer = number | bigint | string | Buffer> {
  protected value: T;
  // used to make console.log debugging a little easier
  private [inspect](depth: number, options: any):T {
    return this.value;
  }
  constructor(value: T) {
    const self = this as any;
    if (Buffer.isBuffer(value)) {
      toStrings.set(this, () => value.toString("hex"));
      bufCache.set(this, value);
      self[Symbol.toStringTag] = "Buffer";
    } else {
      const type = typeof value;
      switch (type) {
        case "number":
          toStrings.set(this, () => (value as number).toString(16));
          toBuffers.set(this, () => {
            const arr = new ArrayBuffer(4);
            const view = new DataView(arr);
            view.setInt32(0, value as number);
            return Buffer.from(arr);
          });
          break;
        case "bigint":
          toStrings.set(this, () => (value as bigint).toString(16));
          toBuffers.set(this, () => {
            const arr = new ArrayBuffer(8);
            const view = new DataView(arr);
            view.setBigUint64(0, value as bigint);
            return Buffer.from(arr);
          });
          break;
        case "string": {
          // handle hex-encoded string
          if ((value as string).indexOf("0x") === 0) {
            strCache.set(this, value);
            toBuffers.set(this, () => Buffer.from((value as string).slice(2), "hex"));
          } else {
            // handle a string
            toStrings.set(this, () => {
              const buf = this.toBuffer();
              return buf.toString("hex");
            });
            toBuffers.set(this, () => Buffer.from(value as string));
          }
          break;
        }
        case "undefined": {
          strCache.set(this, value);
          bufCache.set(this, Buffer.from([]));
          break;
        }
        default:
          throw new Error(`Cannot wrap a "${type}" as a json-rpc type`);
      }
      self[Symbol.toStringTag] = type;
    }

    this.value = value;
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
    let buf = bufCache.get(this);
    if (buf === undefined) {
      buf = toBuffers.get(this)();
      bufCache.set(this, buf);
    }
    return buf;
  }
  valueOf(): T {
    return this.value;
  }
  toJSON(): string {
    return this.toString()
  }

}

export type JsonRpcType<T extends number | bigint | string | Buffer> = BaseJsonRpcType<T> & IndexableJsonRpcType<T>;
