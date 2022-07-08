import { bufferToBigInt } from "@ganache/utils";

// bytes1 - bytes32
type Digits = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type Numbers = Digits | 10 | 20 | `${1}${Digits}` | `2${Digits}` | 30 | 31 | 32;
export type BytesN = `bytes${Numbers}`;
export type FixedBytesN = `fixedBytes(${Numbers})`;
export type Handler = keyof typeof Handlers | FixedBytesN;

/**
 * EVM word size for abi encoded data
 */
export const WORD_SIZE = 32 as const; // bytes

/**
 * Used to convert _from_ twos compliment
 * This is calculated via:
 * ~((1n << (8n * BigInt(WORD_SIZE))) - 1n)
 */
const OR_WITH_TWOS_COMPLEMENT =
  -0x10000000000000000000000000000000000000000000000000000000000000000n as const;

/**
 * For dynamic-length types, like `bytes` and `string`, returns the starting
 * position of the value in `memory`, and the `end` position of the value.
 *
 * Calling this function when the type is not dynamic will not work. You have
 * been warned.
 *
 * @param memory
 * @param offset The offset into the given memory from which to start parsing.
 * @returns The starting position of the value in `memory`, and the `end` position of the value.
 */
function getDynamicDataMarkers(memory: Buffer, offset: number) {
  // A Buffer's length maxes out at UInt32 max, 4294967295, (2**(8 * 4)) - 1) so
  // it is safe to decode the `start` and `length` values as UInt32s.
  //
  // If we had a start position "word" of:
  //   00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 60
  // we know we really only need to read the last 4 bytes, since we know that
  // a Buffer's length can't be greater than UInt32 (which can be represented by
  // up to 4 bytes). So we only need to look at:
  // 00 00 00 60
  // `offset + WORD_SIZE - UINT32_BYTE_LENGTH` effectively tells `readUInt32BE`
  // to read only these last 4 bytes of the word that represent the `start`
  // value.
  // We add WORD_SIZE to this value because we are skipping over the location of
  // the length and referencing the start of the location of the data itself.
  const UINT32_BYTE_LENGTH = 4;
  const nextWordOffset = offset + WORD_SIZE;
  const startUint32MemoryPosition = nextWordOffset - UINT32_BYTE_LENGTH;
  const start = memory.readUInt32BE(startUint32MemoryPosition) + WORD_SIZE;

  // the same optimization is applied here.
  // The word that immediately precedes the data itself is the data's `length`:
  const end = start + memory.readUInt32BE(start - UINT32_BYTE_LENGTH);
  return { start, end };
}

/**
 * Ganerates a handler function for solidity's bytes1-bytes32 types
 * @param length From 1 to 32.
 * @returns A function that accepts a memory Buffer and an offset.
 */
export function fixedBytes(length: number) {
  return (memory: Buffer, offset: number) =>
    handleBytes(memory, offset, offset + length);
}

/**
 * Returns the hex representation of the bytes in `memory`.
 *
 * @param memory
 * @param start The start of the data in the given memory.
 * @param end The end of the data in the given memory (not inclusive).
 * @returns
 */
function handleBytes(memory: Buffer, start: number, end: number) {
  return `0x${memory.subarray(start, end).toString("hex")}`;
}

export const int256 = (memory: Buffer, offset: number) => {
  // convert from two's compliment to signed BigInt
  const twosComplementBuffer = memory.subarray(offset, offset + WORD_SIZE);
  const twosComplementBigInt = bufferToBigInt(twosComplementBuffer);
  if (twosComplementBuffer[0] & 128) {
    // if the first bit is `1` we need to convert from two's compliment
    return twosComplementBigInt | OR_WITH_TWOS_COMPLEMENT;
  } else {
    // if the first bit is not `1` we can treat it as unsigned
    return twosComplementBigInt;
  }
};

/**
 * Handle decoding of solidity's `uint256` type from EVM memory
 * @param memory
 * @param offset
 * @returns
 */
export const uint256 = (memory: Buffer, offset: number) =>
  bufferToBigInt(memory.subarray(offset, offset + WORD_SIZE));

/**
 * Handle decoding of solidity's dynamic `string` type from EVM memory
 * @param memory
 * @param offset
 * @returns
 */
export const string = (memory: Buffer, offset: number) => {
  const { start, end } = getDynamicDataMarkers(memory, offset);
  return memory.toString("utf8", start, end);
};

/**
 * Handle decoding of solidity's `bool` type from EVM memory
 * @param memory
 * @param offset
 * @returns
 */
export const bool = (memory: Buffer, offset: number) =>
  memory[offset + 31] !== 0;

/**
 * Handle decoding of solidity's `address` type from EVM memory
 * @param memory
 * @param offset
 * @returns A 20 byte hex encoding string, prefixed with 0x
 */
export const address = (memory: Buffer, offset: number) =>
  `0x${memory
    .subarray(offset + 12, offset + WORD_SIZE)
    .toString("hex")
    .padStart(40, "0")}`;

/**
 * Handle decoding of solidity's dynamic `bytes` type from EVM memory
 * @param memory
 * @param offset
 * @returns
 */
export const bytes = (memory: Buffer, offset: number) => {
  const { start, end } = getDynamicDataMarkers(memory, offset);
  return handleBytes(memory, start, end);
};

export const Handlers = {
  address,
  bool,
  bytes,
  int256,
  string,
  uint256
};
