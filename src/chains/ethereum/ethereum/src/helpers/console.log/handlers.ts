import { bufferToBigInt } from "@ganache/utils";

export const WORD_SIZE = 32; // bytes
const OR_WITH_TWOS_COMPLEMENT = ~((1n << (8n * BigInt(WORD_SIZE))) - 1n);

/**
 * For dynamic-length types, like `bytes` and `string`, returns the starting
 * position of the value in `memory`, and the `length` of the value.
 *
 * Calling this function when the type is not dynamic will not work. You have
 * been warned.
 *
 * @param memory
 * @param offset
 * @returns
 */
function getDynamicMarkers(memory: Buffer, offset: number) {
  // Since a Buffer's length can't come anywhere close to
  // `Number.MAX_SAFE_INTEGER` in Node it is safe to decode the start
  // and length values as UInt32s.
  offset += WORD_SIZE;
  const start = memory.readUInt32BE(offset - 4) + WORD_SIZE + 4;
  offset += WORD_SIZE;
  const length = memory.readUInt32BE(offset - 4);
  return { start, length };
}

/**
 * Returns the hex representation of the bytes in `memory`.
 *
 * @param length
 * @param memory
 * @param offset
 * @returns
 */
function handleBytes(length: number, memory: Buffer, offset: number) {
  return `0x${memory.subarray(offset, offset + length).toString("hex")}`;
}

export const int256 = (memory: Buffer, offset: number) => {
  // convert from two's compliment to signed BigInt
  const twosComplementBuffer = memory.subarray(offset, offset + WORD_SIZE);
  const twosComplementBigInt = bufferToBigInt(twosComplementBuffer);
  if (twosComplementBuffer[0] & 128) {
    // if the first bit is `1` we need to convert from two's compliment
    return twosComplementBigInt | OR_WITH_TWOS_COMPLEMENT;
  } else {
    // if the first bit is not `1` we can treated it as unsigned.
    return twosComplementBigInt;
  }
};

export const uint256 = (memory: Buffer, offset: number) =>
  bufferToBigInt(memory.subarray(offset, offset + WORD_SIZE));

export const string = (memory: Buffer, offset: number) => {
  const { start, length } = getDynamicMarkers(memory, offset);
  return memory.toString("utf8", start, start + length);
};

export const bool = (memory: Buffer, offset: number) =>
  memory[offset + 31] !== 0;

export const address = (memory: Buffer, offset: number) =>
  memory.subarray(offset + 12, offset + WORD_SIZE);

export const bytes = (memory: Buffer, offset: number) => {
  const { start, length } = getDynamicMarkers(memory, offset);
  return handleBytes(length, memory, start);
};

export const fixedBytes = Array.from({ length: 32 }, (_: any, length: number) =>
  // partially apply handleBytes with `length`
  handleBytes.bind(null, length)
);

export const Handlers = {
  address,
  bool,
  bytes,
  int256: int256,
  string,
  uint256: uint256
};
