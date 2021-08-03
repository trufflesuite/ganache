import { getLength, decode as _decode } from "rlp";
import type { Decoded } from "rlp";
import type { RangeOf, Remainders } from "./types";
import { uintToBuffer } from "@ganache/utils";

export { getLength, Decoded };

export declare type Input = Buffer | Buffer[] | List;
export interface List extends Array<Input> {}

export declare type EncodingInput = Buffer[] | EncodingList;
export interface EncodingList extends Array<EncodingInput | Buffer> {}

export type EncodedPart = {
  length: number;
  output: Buffer[];
};

/**
 * Begin RLP encoding of `items`, from `start` until `length`. Call `RLP.digest` to
 * finish encoding.
 *
 * @param input
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
 * @param ranges
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
 * @param input
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

export function decode(input: Buffer[]): Buffer[];
export function decode(input: Buffer): Buffer;
export function decode<T>(input: Buffer | Buffer[]): T;
export function decode<T = Buffer | Buffer[]>(
  input: Buffer | Buffer[]
): T | T[] {
  return (_decode(input) as unknown) as T;
}
