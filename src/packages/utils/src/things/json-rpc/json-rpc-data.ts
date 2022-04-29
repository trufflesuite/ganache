import { BaseJsonRpcType } from "./json-rpc-base-types";
const BUFFER_EMPTY = Buffer.allocUnsafe(0);

type JsonRpcDataInputArg = string | Buffer;

export class Data extends BaseJsonRpcType {
  constructor(value: JsonRpcDataInputArg, private _byteLength?: number) {
    super(value);

    if (typeof value === "bigint") {
      throw new Error(`Cannot create a ${typeof value} as a Data`);
    }
    if (_byteLength !== undefined) {
      Data.validateByteLength(_byteLength);
    }
  }

  public toString(byteLength?: number): string | null {
    Data.validateByteLength(byteLength);
    const length = byteLength || this._byteLength;

    if (this.bufferValue == null) {
      return <null>this.bufferValue;
    }

    if (length === undefined) {
      return super.toString();
    }

    return `0x${Data.padString(this.bufferValue.toString("hex"), length)}`;
  }

  public toBuffer(byteLength?: number): Buffer {
    Data.validateByteLength(byteLength);

    const length = byteLength || this._byteLength;

    if (this.bufferValue == null) {
      return BUFFER_EMPTY;
    }

    if (length === undefined || length === this.bufferValue.length) {
      return this.bufferValue;
    }

    return Data.padBuffer(this.bufferValue, length);
  }

  public static from(value: JsonRpcDataInputArg, byteLength?: number) {
    if (value instanceof Data) {
      return value;
    }
    return new Data(value, byteLength);
  }

  private static validateByteLength(byteLength?: number) {
    if (byteLength !== undefined && (typeof byteLength !== "number" || byteLength < 0 || !isFinite(byteLength))) {
      throw new Error(`byteLength must be a number greater than or equal to 0, provided: ${byteLength}`);
    }
  }
  
  private static padString(value: string, byteLength: number | undefined) {
    let paddedString;
    const charLength = byteLength * 2
  
    if (byteLength === undefined || charLength === value.length) {
      return value;
    }
  
    // (desired byte count - actual byte count) * 2 characters per byte
    const padCharCount = (byteLength - value.length / 2) * 2;
    if (padCharCount === 0) {
      paddedString = value;
    } else if (padCharCount > 0) {
      paddedString = "0".repeat(padCharCount) + value;
    } else {
      paddedString = value.slice(0, charLength);
    }
    return paddedString;
  }
  
  private static padBuffer(value: Buffer, byteLength: number | undefined) {
    if (byteLength === undefined || byteLength === value.length) {
      return value;
    }
  
    const returnValue = Buffer.allocUnsafe(byteLength);
  
    const sourceStart = 0;
    const targetStart = value.length > byteLength ? 0 : byteLength - value.length;
    if (targetStart > 0) {
      returnValue.fill(0, 0, targetStart);
    }
  
    value.copy(returnValue, targetStart, sourceStart, byteLength);
  
    return returnValue;
  }

  static toBuffer(value: JsonRpcDataInputArg, byteLength?: number): Buffer {
    return Data.from(value, byteLength).toBuffer();
  }

  static toString(value: JsonRpcDataInputArg, byteLength?: number): string {
    return Data.from(value, byteLength).toString();
  }
}
