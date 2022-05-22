import {bigIntToBuffer} from "../../utils/bigint-to-buffer";
import {uintToBuffer} from "../../utils/uint-to-buffer";

const BUFFER_EMPTY = Buffer.allocUnsafe(0);

export type JsonRpcInputArg = number | bigint | string | Buffer;

export function parseAndValidateBufferInput(input: Buffer): Buffer {
  return input;
}

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

export function parseAndValidateBigIntInput(input: bigint): Buffer {
  if (input < 0n) {
    throw new Error("Cannot wrap a negative value as a json-rpc type");
  }
  return input === 0n ? BUFFER_EMPTY : bigIntToBuffer(input as bigint);
}

const VALIDATE_REGEX = /^0x[0-9a-f]*$/i;
export function parseAndValidateStringInput(input: string): Buffer {
  if (!VALIDATE_REGEX.test(input)) {
    throw new Error(`Cannot wrap string value "${input}" as a json-rpc type; strings must be hex-encoded and prefixed with "0x".`);
  }

  let hexValue = (<string>input).slice(2);

  // hexValue must be an even number of hexidecimal characters for decoding in Buffer.from
  // see: https://nodejs.org/api/buffer.html#buffers-and-character-encodings
  if (hexValue.length & 1) {
    hexValue = `0${hexValue}`;
  }

  return Buffer.from(hexValue, "hex");
}

export function parseAndValidateNullInput(input: null | undefined): Buffer {
  return input;
}

const TYPE_TO_PARSER_MAP = {
  number: parseAndValidateNumberInput,
  bigint: parseAndValidateBigIntInput,
  string: parseAndValidateStringInput
};

export function getParseAndValidateFor(input: JsonRpcInputArg): any {
  if (input == null) {
    return parseAndValidateNullInput
  }

  if (Buffer.isBuffer(input)) {
    return parseAndValidateBufferInput;
  }

  const type = typeof input;
  const parser = TYPE_TO_PARSER_MAP[type];
  if (parser === undefined) {
    throw new Error(`Cannot wrap a "${type}" as a json-rpc type`);
  }

  return parser;
}
