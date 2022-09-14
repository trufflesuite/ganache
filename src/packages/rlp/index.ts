import type { RangeOf, Remainders } from "./types";
import { BUFFER_EMPTY, uintToBuffer } from "@ganache/utils";

export declare type Input = Buffer | Buffer[] | List;
export interface List extends Array<Input> {}

export declare type EncodingInput = Buffer[] | EncodingList;
export interface EncodingList extends Array<EncodingInput | Buffer> {}

export type EncodedPart = {
  length: number;
  output: Buffer[];
};

export type NestedBuffer = Array<Buffer | NestedBuffer>;

export interface Decoded<T extends Buffer | NestedBuffer> {
  data: T;
  remainder: Buffer;
}

/**
 * Begin RLP encoding of `items`, from `start` until `length`. Call `RLP.digest` to
 * finish encoding.
 *
 **/
export function encodeRange<
  T extends EncodingInput | Readonly<EncodingInput>,
  Start extends RangeOf<T["length"]>
>(
  items: T,
  start: Start,
  length: Exclude<Remainders<T["length"], Start>, 0>
): EncodedPart {
  let count = 0;

  const end = start + length;
  const output: Buffer[] = [];
  for (var i = start; i < end; i++) {
    const item = items[i];
    const encoded = encode(item);
    count += encoded.length;
    output.push(encoded);
  }
  return { length: count, output };
}

/**
 * Finishes encoding started by `encodeRange`.
 *
 * @param ranges -
 * @returns returns a Buffer of encoded data
 */
export function digest(ranges: Readonly<Buffer[]>[], length: number) {
  const encodedLength = encodeLength(length, 192);
  const lengthEncodedLength = encodedLength.length;
  const buf = Buffer.allocUnsafe(lengthEncodedLength + length);
  encodedLength.copy(buf, 0, 0, lengthEncodedLength);
  let offset = lengthEncodedLength;
  for (let i = 0, l = ranges.length; i < l; i++) {
    const range = ranges[i];
    for (let j = 0, m = range.length; j < m; j++) {
      const entry = range[j];
      const size = entry.length;
      entry.copy(buf, offset, 0, size);
      offset += size;
    }
  }
  return buf;
}

/**
 * RLP Encoding based on: https://github.com/ethereum/wiki/wiki/%5BEnglish%5D-RLP
 * @param input -
 * @returns returns a Buffer of encoded data
 **/
export function encode(input: Input | Readonly<Input>): Buffer {
  if (Array.isArray(input)) {
    let length = 0;
    const output: Buffer[] = [];
    for (let i = 0, l = input.length; i < l; i++) {
      const enc = encode(input[i]);
      length += enc.length;
      output.push(enc);
    }
    const buf = Buffer.concat(output, length);
    const encodedLength = encodeLength(length, 192);
    return Buffer.concat([encodedLength, buf], encodedLength.length + length);
  } else {
    if (input == null) {
      const buf = Buffer.allocUnsafe(1);
      buf[0] = 128;
      return buf;
    } else {
      const length = input.length;
      if (length === 1 && input[0] < 128) {
        return input as Buffer;
      } else {
        const encLength = encodeLength(length, 128);
        return Buffer.concat(
          [encLength, input as Buffer],
          encLength.length + length
        );
      }
    }
  }
}

export function encodeLength(len: number, offset: number): Buffer {
  if (len < 56) {
    const buf = Buffer.allocUnsafe(1);
    buf[0] = len + offset;
    return buf;
  } else {
    const hexLength = uintToBuffer(len);
    const lLength = hexLength.length;
    const firstByte = uintToBuffer(offset + 55 + lLength);
    return Buffer.concat([firstByte, hexLength], firstByte.length + lLength);
  }
}

/**
 * Slices a Buffer, throws if the slice goes out-of-bounds of the Buffer.
 * E.g. `safeSlice(hexToBytes('aa'), 1, 2)` will throw.
 * @param input
 * @param start
 * @param end
 */
function safeSlice(input: Buffer, start: number, end: number) {
  if (end > input.length) {
    throw new Error(
      "invalid RLP (safeSlice): end slice of Buffer out-of-bounds"
    );
  }
  return input.slice(start, end);
}

/**
 * RLP Decoding based on https://eth.wiki/en/fundamentals/rlp
 * @param input Will be converted to Buffer
 * @returns decoded Array of Buffers containing the original message
 **/
export function decode<T extends Buffer | NestedBuffer = Buffer | NestedBuffer>(
  input: Buffer
): T {
  if (!input || input.length === 0) {
    return BUFFER_EMPTY as T;
  }
  const decoded = _decode<T>(input);

  if (decoded.remainder.length !== 0) {
    throw new Error("invalid RLP: remainder must be zero");
  }

  return decoded.data;
}

/**
 * Parse integers. Check if there is no leading zeros
 * @param v The value to parse
 */
function decodeLength(v: Buffer): number {
  if (v[0] === 0) {
    throw new Error("invalid RLP: extra zeros");
  }
  return parseHexByte(bytesToHex(v));
}

/** Decode an input with RLP */
function _decode<T extends Buffer | NestedBuffer>(input: Buffer): Decoded<T> {
  let length: number,
    llength: number,
    data: T,
    innerRemainder: Buffer,
    d: Decoded<T>;
  const decoded = [];
  const firstByte = input[0];

  if (firstByte <= 0x7f) {
    // a single byte whose value is in the [0x00, 0x7f] range, that byte is its own RLP encoding.
    return {
      data: input.slice(0, 1) as unknown as T,
      remainder: input.slice(1)
    };
  } else if (firstByte <= 0xb7) {
    // string is 0-55 bytes long. A single byte with value 0x80 plus the length of the string followed by the string
    // The range of the first byte is [0x80, 0xb7]
    length = firstByte - 0x7f;

    // set 0x80 null to 0
    if (firstByte === 0x80) {
      data = Buffer.from([]) as unknown as T;
    } else {
      data = safeSlice(input, 1, length) as unknown as T;
    }

    if (length === 2 && data[0] < 0x80) {
      throw new Error(
        "invalid RLP encoding: invalid prefix, single byte < 0x80 are not prefixed"
      );
    }

    return {
      data,
      remainder: input.slice(length)
    };
  } else if (firstByte <= 0xbf) {
    // string is greater than 55 bytes long. A single byte with the value (0xb7 plus the length of the length),
    // followed by the length, followed by the string
    llength = firstByte - 0xb6;
    if (input.length - 1 < llength) {
      throw new Error("invalid RLP: not enough bytes for string length");
    }
    length = decodeLength(safeSlice(input, 1, llength));
    if (length <= 55) {
      throw new Error(
        "invalid RLP: expected string length to be greater than 55"
      );
    }
    data = safeSlice(input, llength, length + llength) as unknown as T;

    return {
      data,
      remainder: input.slice(length + llength)
    };
  } else if (firstByte <= 0xf7) {
    // a list between 0-55 bytes long
    length = firstByte - 0xbf;
    innerRemainder = safeSlice(input, 1, length);
    while (innerRemainder.length) {
      d = _decode(innerRemainder);
      decoded.push(d.data);
      innerRemainder = d.remainder;
    }

    return {
      data: decoded as unknown as T,
      remainder: input.slice(length)
    };
  } else {
    // a list over 55 bytes long
    llength = firstByte - 0xf6;
    length = decodeLength(safeSlice(input, 1, llength));
    if (length < 56) {
      throw new Error("invalid RLP: encoded list too short");
    }
    const totalLength = llength + length;
    if (totalLength > input.length) {
      throw new Error("invalid RLP: total length is larger than the data");
    }

    innerRemainder = safeSlice(input, llength, totalLength);

    while (innerRemainder.length) {
      d = _decode(innerRemainder);
      decoded.push(d.data);
      innerRemainder = d.remainder;
    }

    return {
      data: decoded as unknown as T,
      remainder: input.slice(totalLength)
    };
  }
}

const cachedHexes = Array.from({ length: 256 }, (_v, i) =>
  i.toString(16).padStart(2, "0")
);
function bytesToHex(uint8a: Buffer): string {
  // Pre-caching chars with `cachedHexes` speeds this up 6x
  let hex = "";
  for (let i = 0; i < uint8a.length; i++) {
    hex += cachedHexes[uint8a[i]];
  }
  return hex;
}

function parseHexByte(hexByte: string): number {
  const byte = Number.parseInt(hexByte, 16);
  if (Number.isNaN(byte)) throw new Error("Invalid byte sequence");
  return byte;
}
