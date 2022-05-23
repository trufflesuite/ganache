import { bufferToBigInt } from "../../utils/buffer-to-bigint";
import { BaseJsonRpcType } from "./json-rpc-base-types";
import { JsonRpcInputArg } from "./input-parsers";

const BUFFER_EMPTY = Buffer.alloc(0);

export class Quantity extends BaseJsonRpcType {
  private static ZERO_VALUE_STRING = "0x0";

  _nullable: boolean = false;

  public static from(value: JsonRpcInputArg, nullable = false) {
    if (value instanceof Quantity) return value;
    return new Quantity(value, nullable);
  }

  constructor(value: JsonRpcInputArg, nullable?: boolean) {
    super(value);
    if (typeof(value) === "string" && value === "0x") {
      throw new Error("Cannot wrap a 0x value as a json-rpc Quantity type; Quantity must contain at least one digit");
    }
    this._nullable = nullable;
  }

  public toString(): string | null {
    if (this.bufferValue == null) {
      return this._nullable? this.bufferValue : Quantity.ZERO_VALUE_STRING;
    }

    let firstNonZeroByte = 0;
    for (firstNonZeroByte = 0; firstNonZeroByte < this.bufferValue.length; firstNonZeroByte++) {
      if (this.bufferValue[firstNonZeroByte] !== 0) break;
    }

    // bufferValue is empty, or contains only 0 bytes
    if (firstNonZeroByte === this.bufferValue.length) {
      return Quantity.ZERO_VALUE_STRING;
    }

    let value = this.bufferValue.toString("hex", firstNonZeroByte);

    // only need to check the first char, as we have already skipped 0 bytes in call to this.bufferValue.toString().
    if (value[0] === "0") {
      value = value.slice(1);
    }

    return `0x${value}`;
  }

  public toBuffer(): Buffer {
    if (this.bufferValue == null) {
      return BUFFER_EMPTY;
    }

    const firstNonZeroByte = this.findFirstNonZeroByteIndex();

    if (firstNonZeroByte > 0) {
      return this.bufferValue.slice(firstNonZeroByte);
    } else {
      return this.bufferValue;
    }
  }

  public toBigInt(): bigint | null {
    if (this.bufferValue == null) {
      return this._nullable ? this.bufferValue : 0n;
    }
    if (this.bufferValue.length === 0) {
      return 0n;
    }
    return bufferToBigInt(this.bufferValue);
  }

  public toNumber() {
    if (this.bufferValue == null) {
      return this._nullable ? this.bufferValue : 0;
    }

    const firstNonZeroByte = this.findFirstNonZeroByteIndex();

    const length = this.bufferValue.length - firstNonZeroByte;
    if (length === 0) {
      return 0;
    }

    let result: number;
    if (length > 6) {
      const trimmedBuffer = firstNonZeroByte === 0 ? this.bufferValue : this.bufferValue.slice(this.bufferValue);
      result = Number(bufferToBigInt(trimmedBuffer));
    } else {
      result = this.bufferValue.readUIntBE(firstNonZeroByte, length);
    }
    if (!Number.isSafeInteger(result)) {
      console.warn(`0x${this.bufferValue.toString("hex")} is too large - the maximum safe integer value is 0${Number.MAX_SAFE_INTEGER.toString(16)}`);
    }
    return result;
  }

  valueOf(): bigint {
    if (this.bufferValue == null) {
      return <null>this.bufferValue;
    } else {
      return this.toBigInt();
    }
  }

  private findFirstNonZeroByteIndex(): number {
    let firstNonZeroByte = 0;
    for (firstNonZeroByte = 0; firstNonZeroByte < this.bufferValue.length; firstNonZeroByte++) {
      if (this.bufferValue[firstNonZeroByte] !== 0) break;
    }
    return firstNonZeroByte;
  }

  static toBuffer(value: JsonRpcInputArg, nullable?: boolean): Buffer {
    return Quantity.from(value, nullable).toBuffer();
  }

  static toString(value: JsonRpcInputArg, nullable?: boolean): string {
    return Quantity.from(value, nullable).toString();
  }

  static toNumber(value: JsonRpcInputArg, nullable?: boolean): number {
    return Quantity.from(value, nullable).toNumber();
  }

  static toBigInt(value: JsonRpcInputArg, nullable?: boolean): bigint {
    return Quantity.from(value, nullable).toBigInt();
  }
}

export default Quantity;
