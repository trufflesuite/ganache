import { BaseJsonRpcType } from "./json-rpc-base-types";
import { BUFFER_EMPTY } from "../../utils/constants";

export type JsonRpcDataInputArg = string | Buffer;

export class Data extends BaseJsonRpcType {
  public static Empty = Data.from(BUFFER_EMPTY);

  constructor(value: JsonRpcDataInputArg, private _byteLength?: number) {
    super(value);

    if (typeof value === "bigint") {
      throw new Error(`Cannot create a ${typeof value} as a Data`);
    }
  }

  public toString(byteLength?: number): string | null {
    const length = byteLength || this._byteLength;

    if (this.bufferValue == null) {
      return "0x";
    }

    if (length === undefined) {
      return super.toString();
    }

    const strValue = this.bufferValue.toString("hex");
    return `0x${Data.stringToFixedByteLength(strValue, length)}`;
  }

  public toBuffer(byteLength?: number): Buffer {
    if (this.bufferValue == null) {
      return BUFFER_EMPTY;
    }

    const length = byteLength || this._byteLength;
    if (length == undefined || length === this.bufferValue.length) {
      return this.bufferValue;
    }

    return Data.bufferToFixedByteLength(this.bufferValue, length);
  }

  public static from(value: JsonRpcDataInputArg, byteLength?: number) {
    return new Data(value, byteLength);
  }

  private static stringToFixedByteLength(value: string, byteLength: number) {
    const desiredCharLength = byteLength * 2;

    if (desiredCharLength === value.length) {
      return value;
    }

    const padCharCount = desiredCharLength - value.length;
    let fixedLengthValue: string;
    if (padCharCount > 0) {
      fixedLengthValue = "0".repeat(padCharCount) + value;
    } else {
      fixedLengthValue = value.slice(0, desiredCharLength);
    }
    return fixedLengthValue;
  }

  private static bufferToFixedByteLength(value: Buffer, byteLength: number) {
    if (byteLength === value.length) {
      return value;
    }

    const fixedLengthValue = Buffer.allocUnsafe(byteLength);

    const sourceStart = 0;
    const targetStart =
      value.length > byteLength ? 0 : byteLength - value.length;
    if (targetStart > 0) {
      fixedLengthValue.fill(0, 0, targetStart);
    }

    value.copy(fixedLengthValue, targetStart, sourceStart, byteLength);

    return fixedLengthValue;
  }

  static toBuffer(value: JsonRpcDataInputArg, byteLength?: number): Buffer {
    return Data.from(value, byteLength).toBuffer();
  }

  static toString(value: JsonRpcDataInputArg, byteLength?: number): string {
    return Data.from(value, byteLength).toString();
  }
}
