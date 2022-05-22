import { JsonRpcInputArg, getParseAndValidateFor } from "./input-parsers";

const inspect = Symbol.for("nodejs.util.inspect.custom");
export class BaseJsonRpcType {
  public [Symbol.toStringTag]: string;

  protected bufferValue: any | null;

  // used to make console.log debugging a little easier
  private [inspect](_depth: number, _options: any): string {
    return `[${this.constructor.name}] ${this.toString()}`;
  }

  constructor(value: JsonRpcInputArg) {
    this[Symbol.toStringTag] = typeof(value);

    const parseAndValidate = getParseAndValidateFor(value);
    this.bufferValue = parseAndValidate(value);
  }

  toString(): string | null {
    if (this.bufferValue == null) {
      return <null>this.bufferValue;
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
