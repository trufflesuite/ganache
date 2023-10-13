import { bufferToBigInt } from "@ganache/utils";

/**
 * Decodes a raw bytes value from a Solidity `bytes` type.
 * @param bytes
 * @returns
 */
export function rawDecodeBytes(bytes: Buffer) {
  // we check data.byteLength, as `data.subarray(0, end)` allows `end` to be
  // greater than the length of the buffer, which is not valid when decoding.

  if (bytes.byteLength < 32) throw new Error("Invalid length");
  const sizeOffset = Number(bufferToBigInt(bytes.subarray(0, 32)));

  const sizeEnd = sizeOffset + 32;
  if (bytes.byteLength < sizeEnd) throw new Error("Invalid length");

  const size = Number(bufferToBigInt(bytes.subarray(sizeOffset, sizeEnd)));
  const dataEnd = sizeEnd + size;

  if (bytes.byteLength < dataEnd) throw new Error("Invalid length");
  return bytes.subarray(sizeEnd, dataEnd);
}
