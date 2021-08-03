import { toBufferBE } from "../common";
import { uintToBuffer } from "./uint-to-buffer";

const allocUnsafe = Buffer.allocUnsafe;

let _bigIntToBuffer: (val: bigint) => Buffer;
/**
 * Returns the number of bytes contained in this given `value`.
 * @param value
 */
function bigIntByteLength(value: bigint) {
  let length = 1;
  while ((value >>= 8n)) length++;
  return length;
}

const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);
try {
  // force fallback if only `toBufferBE` is missing (this can happen if toBufferBE isn't polyfilled for the browser,
  // which, at the time of this writing... it isn't)
  if (!toBufferBE) throw new Error("Missing function `toBufferBE`!");

  _bigIntToBuffer = (value: bigint) => {
    if (value <= MAX_SAFE_INTEGER) {
      return uintToBuffer(Number(value));
    } else {
      const size = bigIntByteLength(value);
      return toBufferBE(value, size);
    }
  };
} catch (e) {
  _bigIntToBuffer = (value: bigint): Buffer => {
    if (value <= MAX_SAFE_INTEGER) {
      // if this value can be handled as a JS number safely, convert it that way
      return uintToBuffer(Number(value));
    } else {
      let length = bigIntByteLength(value);
      const buf = allocUnsafe(length);
      // process 1 byte at a time
      do {
        // truncate to right-most 32 bits and assign to buffer position `length`
        buf[--length] = Number(value & 0xffffffffn);
        // shift right-most byte off since we've used it
        value >>= 8n;
      } while (length);
      return buf;
    }
  };
}

/**
 * Converts a bigint to a Buffer (Big Endian)
 */
export const bigIntToBuffer = _bigIntToBuffer;
