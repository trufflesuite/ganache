import {bigIntToBuffer} from "../../utils/bigint-to-buffer";
import {uintToBuffer} from "../../utils/uint-to-buffer";

const BUFFER_EMPTY = Buffer.allocUnsafe(0);

export type JsonRpcInputArg = number | bigint | string | Buffer;

const TYPE_TO_PARSER_MAP = {
  number: parseAndValidateNumberInput,
  bigint: parseAndValidateBigIntInput,
  string: parseAndValidateStringInput
};

/**
 * JSON-RPC data types store their value internally as a {@link Buffer}. This function returns another
 * function which will perform the parsing and validation of the given input to a {@link Buffer} for this purpose.
 * @param {T} input - the value for which a ParseAndValidate function will be returned.
 * @returns {(T) => Buffer} a ParseAndValidate function for the given input.
 */
export function getParseAndValidateFor<T extends JsonRpcInputArg>(input: T): ((T) => Buffer) {
  if (input == null || Buffer.isBuffer(input)) {
    return noopParseAndValidate;
  }

  const type = typeof input;
  const parser = TYPE_TO_PARSER_MAP[type];
  if (parser === undefined) {
    throw new Error(`Cannot wrap a "${type}" as a json-rpc type`);
  }

  return parser;
}

/**
 * ParseAndValidate function that performs no operation, and returns the input parameter.
 * @param {T} input
 * @returns {T} input parameter without performing and operations.
 */
export function noopParseAndValidate<T>(input: T): T {
  return input;
}

/**
 * Parse and validate a {@link number} to {@link Buffer} as internal representation for a JSON-RPC data type.
 * @param {number} input - must be a positive, finite integer, or null.
 * @returns {Buffer}
 */
export function parseAndValidateNumberInput(input: number): Buffer {
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
    return BUFFER_EMPTY;
  } else {
    return uintToBuffer(input as number);
  }
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
  return input === 0n ? BUFFER_EMPTY : bigIntToBuffer(input as bigint);
}

const VALIDATE_REGEX = /^0x[0-9a-f]*$/i;
/**
 * Parse and validate a {@link string} to {@link Buffer} as internal representation for a JSON-RPC data type.
 * @param  {string} input - must be a hex encoded integer prefixed with "0x".
 * @returns Buffer
 */
export function parseAndValidateStringInput(input: string): Buffer {
  if (!VALIDATE_REGEX.test(input)) {
    throw new Error(`Cannot wrap string value "${input}" as a json-rpc type; strings must be hex-encoded and prefixed with "0x".`);
  }

  let hexValue = (<string>input).slice(2);

  // hexValue must be an even number of hexidecimal characters in order to correctly decode in Buffer.from
  // see: https://nodejs.org/api/buffer.html#buffers-and-character-encodings
  if (hexValue.length & 1) {
    hexValue = `0${hexValue}`;
  }

  return Buffer.from(hexValue, "hex");
}
