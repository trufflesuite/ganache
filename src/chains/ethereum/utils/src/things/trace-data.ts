import { bufferToMinHexKey } from "@ganache/utils";

export interface ITraceData {
  toBuffer(): Buffer;
  toString(): string;
  toJSON(): string;
  isTraceData?: boolean;
}

const BYTE_LENGTH = 32;

/**
 * Precomputed 32-byte prefixes to make stringification a faster
 */
const PREFIXES = [
  "",
  "00",
  "0000",
  "000000",
  "00000000",
  "0000000000",
  "000000000000",
  "00000000000000",
  "0000000000000000",
  "000000000000000000",
  "00000000000000000000",
  "0000000000000000000000",
  "000000000000000000000000",
  "00000000000000000000000000",
  "0000000000000000000000000000",
  "000000000000000000000000000000",
  "00000000000000000000000000000000",
  "0000000000000000000000000000000000",
  "000000000000000000000000000000000000",
  "00000000000000000000000000000000000000",
  "0000000000000000000000000000000000000000",
  "000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000",
  "0000000000000000000000000000000000000000000000",
  "000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000",
  "0000000000000000000000000000000000000000000000000000",
  "000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000",
  "0000000000000000000000000000000000000000000000000000000000",
  "000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000",
  "0000000000000000000000000000000000000000000000000000000000000000"
];

export const TraceDataFactory = () => {
  const traceDataLookup: Map<string, ITraceData> = new Map();

  const TraceData = {
    from: (value: Buffer) => {
      // Remove all leading zeroes from keys.
      const key = bufferToMinHexKey(value);
      const existing = traceDataLookup.get(key);

      if (existing) {
        return existing;
      }

      let buffer: Buffer;
      let str: string;

      const data: ITraceData = {
        /**
         * Returns a 32-byte 0-padded Buffer
         */
        toBuffer: () => {
          if (buffer) {
            return buffer;
          }
          const length = value.byteLength;
          if (length === BYTE_LENGTH) {
            buffer = value;
          } else {
            // convert the buffer into the appropriately sized buffer.
            const lengthDiff = BYTE_LENGTH - length;
            buffer = Buffer.allocUnsafe(BYTE_LENGTH).fill(0, 0, lengthDiff);
            value.copy(buffer, lengthDiff, 0, length);
          }
          return buffer;
        },
        /**
         * Returns a 32-byte hex-string representation
         */
        toJSON: () => {
          if (str) {
            return str;
          }
          // convert a hex key like "ab01" into "00...00ab01"
          return (str = `${PREFIXES[BYTE_LENGTH - key.length / 2]}${key}`);
        }
      };

      traceDataLookup.set(key, data);
      return data;
    }
  };

  return TraceData;
};
