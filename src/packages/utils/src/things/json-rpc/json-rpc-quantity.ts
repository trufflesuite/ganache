import { bufferToBigInt } from "../../utils/buffer-to-bigint";
import { BaseJsonRpcType, JsonRpcInputArg } from "./json-rpc-base-types";
const BUFFER_EMPTY = Buffer.alloc(0);

export class Quantity extends BaseJsonRpcType {
  private static DEFAULT_STRING_VALUE = "0x0";

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
      return this._nullable? this.bufferValue : Quantity.DEFAULT_STRING_VALUE;
    }

    let firstNonZeroByte = 0;
    for (firstNonZeroByte = 0; firstNonZeroByte < this.bufferValue.length; firstNonZeroByte++) {
      if (this.bufferValue[firstNonZeroByte] !== 0) break;
    }

    let val = this.bufferValue.toString("hex", firstNonZeroByte);

    if (val.length === 0 || val === "0") {
      // RPC Quantities must represent `0` as `0x0`
      return this._nullable ? null : Quantity.DEFAULT_STRING_VALUE;
    }
    if (val[0] === "0") {
      val = val.slice(1);
    }

    return `0x${val}`;
  }

  public toBuffer(): Buffer {
    if (this.bufferValue == null) {
      return BUFFER_EMPTY;
    }

    let firstNonZeroByte = 0;
    for (firstNonZeroByte = 0; firstNonZeroByte < this.bufferValue.length; firstNonZeroByte++) {
      if (this.bufferValue[firstNonZeroByte] !== 0) break;
    }

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

    let firstNonZeroByte = 0;
    while(this.bufferValue[firstNonZeroByte] === 0 && firstNonZeroByte < this.bufferValue.length) firstNonZeroByte++;

    const length = this.bufferValue.length - firstNonZeroByte;
    if (length === 0) {
      return 0;
    }

    let result: number;
    if (length > 6) {
      const value = firstNonZeroByte === 0 ? this.bufferValue : this.bufferValue.slice(this.bufferValue);
      result = Number(bufferToBigInt(value));
    } else {
      result = this.bufferValue.readUIntBE(firstNonZeroByte, length);
    }
    if (!Number.isSafeInteger(result)) {
      console.warn(`0x${this.bufferValue.toString("hex")} is too large - the maximum safe integer value is 0${Number.MAX_SAFE_INTEGER.toString(16)}`);
    }
    return result;
  }

  valueOf(): bigint {
    const value = this.bufferValue;
    if (value === null) {
      return value as null;
    } else if (value === undefined) {
      return value as undefined;
    } else {
      return this.toBigInt();
    }
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
