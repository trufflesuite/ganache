import { EVMResult } from "@ethereumjs/evm";
import { VM_EXCEPTION } from "./errors";
import { CodedError } from "./coded-error";
import { JsonRpcErrorCode } from "@ganache/utils";
import { Data } from "@ganache/utils";

export class CallError extends CodedError {
  public declare code: JsonRpcErrorCode;
  public data: string;
  constructor(result: EVMResult) {
    const execResult = result.execResult;
    const error = execResult.exceptionError.error;
    let message = VM_EXCEPTION + error;

    super(message, JsonRpcErrorCode.INVALID_INPUT);

    CodedError.captureStackTraceExtended.bind(this, message);
    this.name = this.constructor.name;

    const { returnValue } = execResult;
    const reason = CodedError.createRevertReason(returnValue);
    this.message = reason ? message + " " + reason : message;
    this.data = Data.toString(returnValue);
  }
}
