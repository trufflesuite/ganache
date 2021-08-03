import { JsonRpcErrorCode } from "@ganache/utils";

export class CodedError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    Error.captureStackTrace(this, this.constructor);

    this.code = code;
  }
  static from(error: Error, code: JsonRpcErrorCode) {
    const codedError = new CodedError(error.message, code);
    codedError.stack = error.stack;
    return codedError;
  }
}
