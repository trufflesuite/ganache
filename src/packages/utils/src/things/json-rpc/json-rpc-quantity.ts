import { bufferToBigInt } from "../../utils/buffer-to-bigint";
import { BaseJsonRpcType } from "./json-rpc-base-types";
import { JsonRpcInputArg } from "./input-parsers";
import { BUFFER_EMPTY, BUFFER_ZERO } from "../../utils/constants";
import { bigIntToBuffer } from "../../utils/bigint-to-buffer";

export class Quantity extends BaseJsonRpcType {
  public static Empty = Quantity.from(BUFFER_EMPTY, true);
  public static Zero = Quantity.from(BUFFER_ZERO);
  public static One = Quantity.from(1);
  public static Gwei = Quantity.from(1000000000);

  private static ZERO_VALUE_STRING = "0x0";

  _nullable: boolean = false;

  public static from(value: JsonRpcInputArg, nullable = false): Quantity {
    if (Quantity.isQuantity(value))
      return value;
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
    const bufferValue = this._lazyBufferValue.getValue();
    if (bufferValue == null) {
      return this._nullable ? null : Quantity.ZERO_VALUE_STRING;
    }

    const firstNonZeroByte = this.findFirstNonZeroByteIndex();

    // bufferValue is empty, or contains only 0 bytes
    if (firstNonZeroByte === bufferValue.length) {
      return Quantity.ZERO_VALUE_STRING;
    }

    let value = bufferValue.toString("hex", firstNonZeroByte);

    // only need to check the first char, as we have already skipped 0 bytes in call to bufferValue.toString().
    if (value[0] === "0") {
      value = value.slice(1);
    }

    return `0x${value}`;
  }

  public toBuffer(): Buffer {
    const bufferValue = this._lazyBufferValue.getValue();
    if (bufferValue == null) {
      return BUFFER_EMPTY;
    }

    const firstNonZeroByte = this.findFirstNonZeroByteIndex();

    if (firstNonZeroByte > 0) {
      return bufferValue.subarray(firstNonZeroByte);
    } else {
      return bufferValue;
    }
  }

  public toBigInt(): bigint | null {
    switch (this._rawNumericType) {
      case "bigint":
        return <bigint><any>this._rawNumericValue;
      case "number":
        return BigInt(<number>this._rawNumericValue);
      default: break;
    }

    const bufferValue = this._lazyBufferValue.getValue();
    if (bufferValue == null) {
      return this._nullable ? null : 0n;
    }
    if (bufferValue.length === 0) {
      return 0n;
    }
    return bufferToBigInt(bufferValue);
  }

  public toNumber(): number | null {
    switch (this._rawNumericType) {
      case "bigint":
        return Number(<bigint>this._rawNumericValue);
      case "number":
        return <number>this._rawNumericValue;
      default: break;
    }

    const bufferValue = this._lazyBufferValue.getValue();
    if (bufferValue == null) {
      return this._nullable ? null : 0;
    }

    const firstNonZeroByte = this.findFirstNonZeroByteIndex();

    const length = bufferValue.length - firstNonZeroByte;
    if (length === 0) {
      return 0;
    }

    let result: number;
    // buffer.readUIntBE only supports up to 48 bits, so if larger then we need to convert to bigint first
    if (length > 6) {
      const trimmedBuffer =
        firstNonZeroByte === 0
          ? bufferValue
          : bufferValue.subarray(firstNonZeroByte);

      result = Number(bufferToBigInt(trimmedBuffer));

      if (!Number.isSafeInteger(result)) {
        console.warn(
          `0x${bufferValue.toString(
            "hex"
          )} is too large - the maximum safe integer value is 0${Number.MAX_SAFE_INTEGER.toString(
            16
          )}`
        );
      }
    } else {
      result = bufferValue.readUIntBE(firstNonZeroByte, length);
    }

    return result;
  }

  valueOf(): bigint {
    if (this._lazyBufferValue.getValue() == null) {
      return null;
    } else {
      return this.toBigInt();
    }
  }

  private findFirstNonZeroByteIndex(): number {
    const bufferValue = this._lazyBufferValue.getValue();
    let firstNonZeroByte = 0;
    for (
      firstNonZeroByte = 0;
      firstNonZeroByte < bufferValue.length;
      firstNonZeroByte++
    ) {
      if (bufferValue[firstNonZeroByte] !== 0) break;
    }
    return firstNonZeroByte;
  }

  private static getArgumentAsBigInt(argument: JsonRpcInputArg | Quantity): bigint {
    const argumentType = typeof argument;
    let argumentValue: bigint;

    switch(argumentType) {
      case "number":
        const argumentNumber = argument as number;
        if (argumentNumber % 1) {
          throw new Error("Cannot wrap a decimal as a json-rpc type.");
        }
        if (!isFinite(argumentNumber)) {
          throw new Error(`Cannot wrap ${argument} as a json-rpc type.`);
        }
        argumentValue = BigInt(argumentNumber);
        break;
      case "bigint":
        argumentValue = argument as bigint;
        break;
      case "string":
        if ((argument as string).slice(0, 2).toLowerCase() !== "0x") {
          throw new Error(`Cannot wrap "${argument}" as a JSON-RPC type; strings must be hex-encoded and prefixed with "0x".`);
        }
        argumentValue = BigInt(argument as string);
        break;
      default:
        if (Quantity.isQuantity(argument)) {
          argumentValue = argument.toBigInt();
        } else if (Buffer.isBuffer(argument)) {
          argumentValue = bufferToBigInt(argument);
        } else if (argument == null) {
          argumentValue = 0n;
        } else {
          throw new Error(`Cannot wrap ${argument} as a JSON-RPC type.`);
        }
        break;
    }

    return argumentValue;
  }

  public add(addend: JsonRpcInputArg | Quantity): Quantity {
    const addendValue = Quantity.getArgumentAsBigInt(addend);

    const thisValue = (this.toBigInt() || 0n);
    const sum = thisValue + addendValue;

    if (sum < 0n) {
      throw new Error(`Cannot add ${addend} to a Quantity of ${this}, as it results in a negative value`);
    };

    // convert to buffer directly, as this is cheaper than passing the bigint into the Quantity constructor
    const sumBuffer = bigIntToBuffer(sum);
    return new Quantity(sumBuffer, this._nullable);
  }

  public multiply(multiplier: JsonRpcInputArg | Quantity): Quantity {
    const multiplierValue = Quantity.getArgumentAsBigInt(multiplier);
    if (multiplierValue < 0n) {
      throw new Error(`Cannot multiply a Quantity by a negative multiplier`);
    }

    if (multiplierValue === undefined) {
      throw new Error(`Cannot multiply a Quantity by ${multiplier}`);
    }

    const thisValue = (this.toBigInt() || 0n);
    const productBuffer = bigIntToBuffer(thisValue * multiplierValue);
    return new Quantity(productBuffer, this._nullable);
  }

  /**
   * Returns true if the instance passed conforms to the Quantity interface. This is a best guess effort,
   * and doesn't confirm that the instance passed is an instance of the Quantity class.
   * @param  {any} instance
   * @returns boolean whether the instance conforms to the Quantity interface
   */
  private static isQuantity(instance: any): instance is Quantity {
    return instance != undefined &&
      typeof(instance.toBigInt) === "function" &&
      typeof(instance.toNumber) === "function" &&
      typeof(instance.toBuffer) === "function" &&
      typeof(instance.toString) === "function";
  }

  static toBuffer(value: JsonRpcInputArg, nullable?: false): Buffer;
  static toBuffer(value: JsonRpcInputArg, nullable?: true): Buffer | null;
  static toBuffer(value: JsonRpcInputArg, nullable?: boolean): Buffer | null {
    return Quantity.from(value, nullable).toBuffer();
  }

  static toString(value: JsonRpcInputArg, nullable?: false): string;
  static toString(value: JsonRpcInputArg, nullable?: true): string | null;
  static toString(value: JsonRpcInputArg, nullable?: boolean): string | null {
    return Quantity.from(value, nullable).toString();
  }

  static toNumber(value: JsonRpcInputArg, nullable?: false): number;
  static toNumber(value: JsonRpcInputArg, nullable?: true): number | null;
  static toNumber(value: JsonRpcInputArg, nullable?: boolean): number | null {
    return Quantity.from(value, nullable).toNumber();
  }

  static toBigInt(value: JsonRpcInputArg, nullable?: false): bigint;
  static toBigInt(value: JsonRpcInputArg, nullable?: true): bigint | null;
  static toBigInt(value: JsonRpcInputArg, nullable?: boolean): bigint | null {
    return Quantity.from(value, nullable).toBigInt();
  }
}

export default Quantity;
