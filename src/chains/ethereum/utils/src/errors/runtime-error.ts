import { EVMResult } from "@ethereumjs/evm";
import { VM_EXCEPTION } from "./errors";
import { Data } from "@ganache/utils";
import { CodedError } from "./coded-error";
import { JsonRpcErrorCode } from "@ganache/utils";

export enum RETURN_TYPES {
  TRANSACTION_HASH,
  RETURN_VALUE
}

export class RuntimeError extends CodedError {
  public code: JsonRpcErrorCode;
  public data: {
    hash: string;
    programCounter: number;
    result: string;
    reason?: string;
    message: string;
  };
  constructor(
    transactionHash: Data,
    result: EVMResult,
    returnType: RETURN_TYPES
  ) {
    const execResult = result.execResult;
    const error = execResult.exceptionError.error;
    let message = VM_EXCEPTION + error;

    super(message, JsonRpcErrorCode.INVALID_INPUT);

    CodedError.captureStackTraceExtended.bind(this, message);
    this.name = this.constructor.name;

    const hash = transactionHash.toString();
    const { returnValue } = execResult;
    const reason = CodedError.createRevertReason(returnValue);
    this.message = reason ? message + " " + reason : message;

    this.data = {
      hash: hash,
      programCounter: execResult.runState.programCounter,
      result:
        returnType === RETURN_TYPES.TRANSACTION_HASH
          ? hash
          : Data.toString(returnValue || "0x"),
      reason: reason,
      message: error
    };
  }
}
