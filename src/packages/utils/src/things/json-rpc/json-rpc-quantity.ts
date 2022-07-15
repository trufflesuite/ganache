import { bufferToBigInt } from "../../utils/buffer-to-bigint";
import { BaseJsonRpcType } from "./json-rpc-base-types";
import { JsonRpcInputArg } from "./input-parsers";
import { BUFFER_EMPTY, BUFFER_ZERO } from "../../utils/constants";

export class Quantity extends BaseJsonRpcType {
  public static Empty = Quantity.from(BUFFER_EMPTY, true);
  public static Zero = Quantity.from(BUFFER_ZERO);
  public static One = Quantity.from(1);
  public static Gwei = Quantity.from(1000000000);

  private static ZERO_VALUE_STRING = "0x0";

  _nullable: boolean = false;

  public static from(value: JsonRpcInputArg, nullable = false) {
    if (value instanceof Quantity) return value;
    return new Quantity(value, nullable);
  }

  constructor(value: JsonRpcInputArg, nullable?: boolean) {
    super(value);
    if (value === "0x") {
      throw new Error(
        'Cannot wrap "0x" as a json-rpc Quantity type; strings must contain at least one hexadecimal character.'
      );
    }
    this._nullable = nullable;
  }

  public toString(): string | null {
    if (this.bufferValue == null) {
      return this._nullable ? null : Quantity.ZERO_VALUE_STRING;
    }

    const firstNonZeroByte = this.findFirstNonZeroByteIndex();

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
      return this.bufferValue.subarray(firstNonZeroByte);
    } else {
      return this.bufferValue;
    }
  }

  public toBigInt(): bigint | null {
    if (this.bufferValue == null) {
      return this._nullable ? null : 0n;
    }
    if (this.bufferValue.length === 0) {
      return 0n;
    }
    return bufferToBigInt(this.bufferValue);
  }

  public toNumber() {
    if (this.bufferValue == null) {
      return this._nullable ? null : 0;
    }

    const firstNonZeroByte = this.findFirstNonZeroByteIndex();

    const length = this.bufferValue.length - firstNonZeroByte;
    if (length === 0) {
      return 0;
    }

    let result: number;
    // buffer.readUIntBE only supports up to 48 bits, so if larger then we need to convert to bigint first
    if (length > 6) {
      const trimmedBuffer =
        firstNonZeroByte === 0
          ? this.bufferValue
          : this.bufferValue.subarray(firstNonZeroByte);
      result = Number(bufferToBigInt(trimmedBuffer));

      if (!Number.isSafeInteger(result)) {
        console.warn(
          `0x${this.bufferValue.toString(
            "hex"
          )} is too large - the maximum safe integer value is 0${Number.MAX_SAFE_INTEGER.toString(
            16
          )}`
        );
      }
    } else {
      result = this.bufferValue.readUIntBE(firstNonZeroByte, length);
    }

    return result;
  }

  valueOf(): bigint {
    if (this.bufferValue == null) {
      return null;
    } else {
      return this.toBigInt();
    }
  }

  private findFirstNonZeroByteIndex(): number {
    let firstNonZeroByte = 0;
    for (
      firstNonZeroByte = 0;
      firstNonZeroByte < this.bufferValue.length;
      firstNonZeroByte++
    ) {
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
