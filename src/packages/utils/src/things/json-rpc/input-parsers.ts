import { bigIntToBuffer } from "../../utils/bigint-to-buffer";
import { uintToBuffer } from "../../utils/uint-to-buffer";
import { BUFFER_EMPTY } from "../../utils/constants";

export type JsonRpcInputArg = number | bigint | string | Buffer;

export class Lazy<T> {
  private _resolver?: () => T;

  private constructor(resolver: (() => T)) {
    this._resolver = resolver;
  }

  public getValue(): T {
    const value = this._resolver();
    this.getValue = () => value;
    return value;
  }

  public static of<T>(value: T): Lazy<T> {
    // no point in creating a true instance of Lazy<T> here, just wrap in an Object
    // that implements Lazy<T>.
    return {
      getValue: () => value
    };
  }

  public static from<T>(resolver: () => T): Lazy<T> {
    return new Lazy(resolver);
  }
}

const LAZY_BUFFER_EMPTY = Lazy.of(BUFFER_EMPTY);

/**
 * Parses and validates {@link number} to {@link Buffer} as internal representation for a JSON-RPC data type.
 * @param {number} input - must be a positive, finite integer, or null.
 * @returns {Buffer}
 */
export function parseAndValidateNumberInput(input: number) {
  if (input < 0) {
    throw new Error("Cannot wrap a negative value as a json-rpc type");
  }
  if (input % 1) {
    throw new Error("Cannot wrap a decimal as a json-rpc type");
  }
  if (!isFinite(input)) {
    throw new Error(`Cannot wrap a ${input} as a json-rpc type`);
  }

  if (input === 0) {
    return LAZY_BUFFER_EMPTY;
  }

  return Lazy.from(() => uintToBuffer(input as number));
}

/**
 * Parses and validates {@link bigint} to {@link Buffer} as internal representation for a JSON-RPC data type.
 * @param  {bigint} input - must be a positive integer, or null.
 * @returns {Lazy<Buffer>}
 */
export function parseAndValidateBigIntInput(input: bigint): Lazy<Buffer> {
  if (input < 0n) {
    throw new Error("Cannot wrap a negative value as a json-rpc type");
  }

  if (input === 0n) {
    return LAZY_BUFFER_EMPTY;
  }

  return Lazy.from(() => bigIntToBuffer(input as bigint));
}

/**
 * Parses and validates a {@link string} to {@link Buffer} as internal representation for a JSON-RPC data type.
 * @param  {string} input - must be a hex encoded integer prefixed with "0x".
 * @returns {Lazy<Buffer>}
 */
export function parseAndValidateStringInput(input: string): Lazy<Buffer> {
  if (input.slice(0, 2).toLowerCase() !== "0x") {
    throw new Error(
      `Cannot wrap string value "${input}" as a json-rpc type; strings must be prefixed with "0x".`
    );
  }

  let hexValue = input.slice(2);

  // hexValue must be an even number of hexadecimal characters in order to correctly decode in Buffer.from
  // see: https://nodejs.org/api/buffer.html#buffers-and-character-encodings
  if (hexValue.length & 1) {
    hexValue = `0${hexValue}`;
  }
  const byteLength = Math.ceil(input.length / 2 - 1);

  const _buffer = Buffer.from(hexValue, "hex");
  if (_buffer.length !== byteLength) {
    // Buffer.from will return the result after encountering an input that does not conform to hexadecimal encoding.
    // this means that an invalid input can never return a value with the expected bytelength.
    throw new Error(
      `Cannot wrap string value "${input}" as a json-rpc type; the input value contains an invalid hex character.`
    );
  }

  // Because validation depends on parsing the input, we only wrap the result in Lazy<Buffer> for consistency
  // with the interface. If it were important to decouple validation and parsing, we could consider a different
  // approach, but conversion to all JSON RPC output types from string require conversion to interim Buffer.
  return Lazy.of(_buffer);
}
