import { bigIntToBuffer } from "../../utils";
import { uintToBuffer } from "../../utils";

import { BUFFER_EMPTY } from "../../utils/constants";

export const strCache = new WeakMap();
export const bufCache = new WeakMap();
export const toStrings = new WeakMap();
export const toBuffers = new WeakMap();

const inspect = Symbol.for("nodejs.util.inspect.custom");

export class BaseJsonRpcType<
  T extends number | bigint | string | Buffer =
    | number
    | bigint
    | string
    | Buffer
> {
  public [Symbol.toStringTag]: string;

  protected value: T;
  // used to make console.log debugging a little easier
  private [inspect](_depth: number, _options: any): T {
    return this.value;
  }
  constructor(value: T) {
    const self = this;
    if (Buffer.isBuffer(value)) {
      toStrings.set(this, () => value.toString("hex"));
      bufCache.set(this, value);
      self[Symbol.toStringTag] = "Buffer";
    } else {
      const type = typeof value;
      switch (type) {
        case "number":
          if ((value as number) % 1 !== 0) {
            throw new Error("`Cannot wrap a decimal value as a json-rpc type`");
          }
          toStrings.set(this, () => (value as number).toString(16));
          toBuffers.set(this, () => uintToBuffer(value as number));
          break;
        case "bigint":
          toStrings.set(this, () => (value as bigint).toString(16));
          toBuffers.set(this, () => bigIntToBuffer(value as bigint));
          break;
        case "string": {
          // handle hex-encoded string
          if ((value as string).indexOf("0x") === 0) {
            strCache.set(this, (value as string).toLowerCase());
            toBuffers.set(this, () => {
              let fixedValue = (value as string).slice(2);
              if (fixedValue.length % 2 === 1) {
                fixedValue = "0" + fixedValue;
              }
              return Buffer.from(fixedValue, "hex");
            });
          } else {
            throw new Error(
              `cannot convert string value "${value}" into type \`${this.constructor.name}\`; strings must be hex-encoded and prefixed with "0x".`
            );
          }
          break;
        }
        default:
          // handle undefined/null
          if (value == null) {
            // This is a weird thing that returns undefined/null for a call
            // to toString().
            this.toString = () => value as string;
            bufCache.set(this, BUFFER_EMPTY);
            break;
          }
          throw new Error(`Cannot wrap a "${type}" as a json-rpc type`);
      }
      self[Symbol.toStringTag] = type;
    }

    this.value = value;
  }

  toString(): string | null {
    let str = strCache.get(this);
    if (str === void 0) {
      str = "0x" + toStrings.get(this)();
      strCache.set(this, str);
    }
    return str;
  }
  toBuffer(): Buffer {
    let buf = bufCache.get(this);
    if (buf === void 0) {
      buf = toBuffers.get(this)();
      bufCache.set(this, buf);
    }
    return buf;
  }
  valueOf(): T | null {
    return this.value;
  }
  toJSON(): string | null {
    return this.toString();
  }
}

export type JsonRpcType<
  T extends number | bigint | string | Buffer
> = BaseJsonRpcType<T>;
