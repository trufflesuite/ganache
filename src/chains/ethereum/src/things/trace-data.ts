export interface ITraceData {
  _buffer: Buffer;
  toBuffer(): Buffer;
  toString(): string;
  toJSON(): string;
}

export const TraceDataFactory = () => {
  const traceDataLookup: Map<string, any> = new Map();

  const TraceData = class implements ITraceData {
    static BYTE_LENGTH: number = 32;
    _buffer: Buffer;
    _str: string;

    /**
     * @param value Buffer to be stored within the Trace Data. If you'd like
     *   the value to be memoized, use TraceData.from().
     */
    constructor(value: Buffer) {
      const length = value.length;
      if (length === 0) {
        throw new Error("Empty buffer passed to TraceData.from()");
      } else if (length > TraceData.BYTE_LENGTH) {
        throw new Error(
          `TraceData can only store up to ${TraceData.BYTE_LENGTH} bytes`
        );
      } else {
        // Remove all leading zeroes from keys.
        // This should match all buffers converted to strings,
        // and the third item in the result is the value without leading zeroes.
        const str = value.toString("hex");
        const key = str.match(/(00)*([0-9A-Fa-f]+)/)[2];

        const existing = traceDataLookup.get(key);
        if (existing) {
          return existing;
        }

        traceDataLookup.set(key, this);

        if (length === TraceData.BYTE_LENGTH) {
          this._buffer = value;
          this._str = str;
        } else {
          const lengthDiff = TraceData.BYTE_LENGTH - length;
          const buffer = Buffer.allocUnsafe(TraceData.BYTE_LENGTH).fill(
            0,
            0,
            lengthDiff
          );
          value.copy(buffer, lengthDiff, 0, length);
          this._buffer = buffer;
          this._str = `${"00".repeat(lengthDiff)}${str}`;
        }
      }
    }

    public toString(): string {
      return this._str;
    }

    public toBuffer(): Buffer {
      return this._buffer;
    }

    public toJSON(): string {
      return this._str;
    }

    public static from(value: Buffer) {
      // Remove all leading zeroes from keys.
      // This should match all buffers converted to strings,
      // and the third item in the result is the value without leading zeroes.
      let key = value.toString("hex").match(/(00)*([0-9A-Fa-f]+)/)[2];

      const existing = traceDataLookup.get(key);
      if (existing) {
        return existing;
      }

      const data = new TraceData(value);
      traceDataLookup.set(key, data);
      return data;
    }
  };

  Object.defineProperty(TraceData, "name", { value: "TraceData" });

  return TraceData;
};

export default TraceDataFactory;
