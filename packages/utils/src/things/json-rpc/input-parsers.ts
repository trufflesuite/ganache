import { bigIntToBuffer } from "../../utils/bigint-to-buffer";
import { uintToBuffer } from "../../utils/uint-to-buffer";

const BUFFER_EMPTY = Buffer.allocUnsafe(0);

export type JsonRpcInputArg = number | bigint | string | Buffer;

/**
 * Parse and validate a {@link number} to {@link Buffer} as internal representation for a JSON-RPC data type.
 * @param {number} input - must be a positive, finite integer, or null.
 * @returns {Buffer}
 */
export function parseAndValidateNumberInput(input: number): Buffer {
  if (input === 0) {
    return BUFFER_EMPTY;
  }

  if (input < 0) {
    throw new Error("Cannot wrap a negative value as a json-rpc type");
  }
  if (input % 1) {
    throw new Error("Cannot wrap a decimal as a json-rpc type");
  }
  if (!isFinite(input)) {
    throw new Error(`Cannot wrap a ${input} as a json-rpc type`);
  }

  return uintToBuffer(input as number);
}

/**
 * Parse and validate a {@link bigint} to {@link Buffer} as internal representation for a JSON-RPC data type.
 * @param  {bigint} input - must be a positive integer, or null.
 * @returns {Buffer}
 */
export function parseAndValidateBigIntInput(input: bigint): Buffer {
  if (input < 0n) {
    throw new Error("Cannot wrap a negative value as a json-rpc type");
  }
  return bigIntToBuffer(input as bigint);
}

/**
 * Parse and validate a {@link string} to {@link Buffer} as internal representation for a JSON-RPC data type.
 * @param  {string} input - must be a hex encoded integer prefixed with "0x".
 * @returns Buffer
 */
export function parseAndValidateStringInput(input: string): Buffer {
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

  return _buffer;
}
