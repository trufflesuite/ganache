import {
  JsonRpcInputArg,
  parseAndValidateStringInput,
  parseAndValidateBigIntInput,
  parseAndValidateNumberInput,
  Lazy
} from "./input-parsers";
const inspect = Symbol.for("nodejs.util.inspect.custom");

const LAZY_BUFFER_NULL = Lazy.of(<Buffer>null);

export class BaseJsonRpcType {
  protected _lazyBufferValue: Lazy<Buffer | null>;
  protected _rawNumericValue: number | bigint | undefined;
  protected _rawNumericType: "number" | "bigint" | undefined;

  // used to make console.log debugging a little easier
  private [inspect](_depth: number, _options: any): string {
    return `[${this.constructor.name}] ${this.toString()}`;
  }

  constructor(value: JsonRpcInputArg) {
    if (value == null) {
      this._lazyBufferValue = LAZY_BUFFER_NULL;
    } else if (Buffer.isBuffer(value)) {
      // empty buffer should be treated as null
      this._lazyBufferValue = value.length === 0 ? LAZY_BUFFER_NULL : Lazy.of(value);
    } else {
      switch (typeof value) {
        case "string":
          this._lazyBufferValue = parseAndValidateStringInput(value);
          break;
        case "number":
          this._rawNumericValue = value;
          this._rawNumericType = "number";
          this._lazyBufferValue = parseAndValidateNumberInput(value);
          break;
        case "bigint":
          this._rawNumericValue = value;
          this._rawNumericType = "bigint";
          this._lazyBufferValue = parseAndValidateBigIntInput(value);
          break;
        default:
          throw new Error(`Cannot wrap a "${typeof value}" as a json-rpc type`);
      }
    }
  }

  toString(): string | null {
    const buffer = this._lazyBufferValue.getValue();
    if (buffer == null) {
      return null;
    }
    return `0x${buffer.toString("hex")}`;
  }

  toBuffer(): Buffer {
    return this._lazyBufferValue.getValue();
  }

  valueOf(): any {
    return this._lazyBufferValue.getValue();
  }

  toJSON(): string | null {
    return this.toString();
  }

  isNull() {
    return this._lazyBufferValue.getValue() == null;
  }
}
