import { JsonRpcErrorCode } from "@ganache/utils";
import { rawDecode } from "ethereumjs-abi";

const REVERT_REASON = Buffer.from("08c379a0", "hex"); // keccak("Error(string)").slice(0, 4)
export class CodedError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    CodedError.captureStackTraceExtended.bind(this, message);

    this.code = code;
  }

  static from(error: Error, code: JsonRpcErrorCode) {
    const codedError = new CodedError(error.message, code);
    codedError.stack = error.stack;
    return codedError;
  }
  static nonEnumerableProperty(value) {
    // The field `enumerable` is `false` by default.
    return {
      value: value,
      writable: true,
      configurable: true
    };
  }
  static captureStackTraceExtended(message: string) {
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      // Generic way to set the error stack trace.
      Object.defineProperty(
        this,
        "stack",
        CodedError.nonEnumerableProperty(Error(message).stack)
      );

      // Use the `+` operator with an empty string to implicitly type cast the
      // `message` argument into a string.
      Object.defineProperty(
        this,
        "message",
        CodedError.nonEnumerableProperty(message !== void 0 ? "" + message : "")
      );
    }
  }
  static createRevertReason(returnValue: Buffer) {
    let reason: string | null;
    if (
      returnValue.length > 4 &&
      REVERT_REASON.compare(returnValue, 0, 4) === 0
    ) {
      try {
        // it is possible for the `returnValue` to be gibberish that can't be
        // decoded. See: https://github.com/trufflesuite/ganache/pull/452
        reason = rawDecode(["bytes"], returnValue.slice(4))[0].toString();
      } catch {
        // ignore error since reason string recover is impossible
        reason = null;
      }
    } else {
      reason = null;
    }
    return reason;
  }
}
