import JSBI from "jsbi";
import { JsonRpcQuantity } from ".";

export type IndexableJsonRpcType<T extends number | bigint | string | Buffer = number | bigint | string | Buffer> = string & {
  new(value: T): IndexableJsonRpcType<T>,
  toString(): string
}

const EMPTY_BUFFER = Buffer.allocUnsafe(0);

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
            //onst value = (2n**64n);
            var max = (2n**64n)-1n;

            var val = value as bigint;
            var size = 4;
            var buff = new ArrayBuffer(size * 8);
            var view = new DataView(buff);
            if(val > max) {
                var long = val;
                var index = size - 1;
                while (long > 0) {
                  var byte = long & max;
                  view.setBigUint64(index * 8, byte);
                  long = (long - byte) / max;
                  index--;
                }
            } else {
              view.setBigUint64(0, val);
            }
            return Buffer.from(buff.slice((index+1) * 8));
          });
          break;
        case "string": {
          // handle hex-encoded string
          if ((value as string).indexOf("0x") === 0) {
            strCache.set(this, value);
            toBuffers.set(this, () => {
              let fixedValue = (value as string).slice(2);
              if (fixedValue.length % 2 === 1) {
                fixedValue = "0" + fixedValue;
              }
              return Buffer.from(fixedValue, "hex");
            });
          } else {
            // handle a string
            toStrings.set(this, () => {
              const buf = this.toBuffer();
              return buf.toString("hex");
            });
            // treat string without `0x` as just plain text. This is probably 
            // wrong. TODO: look into this.
            toBuffers.set(this, () => Buffer.from(value as string));
          }
          break;
        }
        default:
          // handle undefined/null
          if (value == null) {
            // This is a weird thing that returns undefined/null for a call
            // to toString().
            this.toString = () => value as string;
            bufCache.set(this, EMPTY_BUFFER);
            break;
          }
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
