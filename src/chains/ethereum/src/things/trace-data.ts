const traceDataLookup: Map<string, TraceData> = new Map();

class TraceData {
  static BYTE_LENGTH: number = 32;
  #buffer: Buffer;

  /**
   * @param value Buffer to be stored within the Trace Data. If you'd like
   *   the value to be memoized, use TraceData.from().
   */
  constructor(value: Buffer) {
    if (value.length > TraceData.BYTE_LENGTH) {
      throw new Error(
        `TraceData can only store up to ${TraceData.BYTE_LENGTH} bytes`
      );
    }

    this.#buffer = value;
  }

  public toString(): string {
    let str = this.#buffer.toString("hex");

    const finalStringLength = TraceData.BYTE_LENGTH * 2;
    const padBy = finalStringLength - str.length;
    if (padBy < 0) {
      // if our hex-encoded data is longer than it should be, throw an error
      // because this shouldn't happen.
      throw new Error(
        "Improperly truncating trace data during stringification!"
      );
    } else if (padBy > 0) {
      // if our hex-encoded data is shorter than it should be, pad it:
      str = "0".repeat(padBy) + str;
    }

    return str;
  }

  public toBuffer(): Buffer {
    return this.#buffer;
  }

  public toJSON(): string {
    return this.toString();
  }

  public static from(value: Buffer) {
    if (value.length == 0) {
      throw new Error("Empty buffer passed to TraceData.from()");
    }

    if (value.length > TraceData.BYTE_LENGTH) {
      throw new Error(
        `TraceData can only store up to ${TraceData.BYTE_LENGTH} bytes`
      );
    }

    // Remove all leading zeroes from keys.
    // This should match all buffers converted to strings,
    // and the third item in the result is the value without leading zeroes.
    let key = value.toString("hex").match(/(00)*([0-9A-Fa-f]+)/)[2];

    let existing = traceDataLookup.get(key);

    if (typeof existing == "undefined") {
      let data = new TraceData(value);
      traceDataLookup.set(key, data);
      return data;
    }

    return existing;
  }
}

export default TraceData;
