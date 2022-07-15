import {
  JsonRpcInputArg,
  parseAndValidateStringInput,
  parseAndValidateBigIntInput,
  parseAndValidateNumberInput
} from "./input-parsers";
const inspect = Symbol.for("nodejs.util.inspect.custom");

export class BaseJsonRpcType {
  protected bufferValue: Buffer | null;

  // used to make console.log debugging a little easier
  private [inspect](_depth: number, _options: any): string {
    return `[${this.constructor.name}] ${this.toString()}`;
  }

  constructor(value: JsonRpcInputArg) {
    if (value == null) {
      this.bufferValue = null;
    } else if (Buffer.isBuffer(value)) {
      // empty buffer should be treated as null
      this.bufferValue = value.length === 0 ? null : value;
    } else {
      switch (typeof value) {
        case "string":
          this.bufferValue = parseAndValidateStringInput(value);
          break;
        case "number":
          this.bufferValue = parseAndValidateNumberInput(value);
          break;
        case "bigint":
          this.bufferValue = parseAndValidateBigIntInput(value);
          break;
        default:
          throw new Error(`Cannot wrap a "${typeof value}" as a json-rpc type`);
      }
    }
  }

  toString(): string | null {
    if (this.bufferValue == null) {
      return null;
    }
    return `0x${this.bufferValue.toString("hex")}`;
  }

  toBuffer(): Buffer {
    return this.bufferValue;
  }

  valueOf(): any {
    return this.bufferValue;
  }

  toJSON(): string | null {
    return this.toString();
  }

  isNull() {
    return this.bufferValue == null;
  }
}
