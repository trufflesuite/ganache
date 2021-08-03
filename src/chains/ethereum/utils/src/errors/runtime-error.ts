import { EVMResult } from "@ethereumjs/vm/dist/evm/evm";
import { VM_EXCEPTION } from "./errors";
import { Data } from "@ganache/utils";
import { rawDecode } from "ethereumjs-abi";
import { CodedError } from "./coded-error";
import { JsonRpcErrorCode } from "@ganache/utils";

const REVERT_REASON = Buffer.from("08c379a0", "hex"); // keccak("Error(string)").slice(0, 4)

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

    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;

    const returnValue = execResult.returnValue;
    const hash = transactionHash.toString();
    let reason: string | null;
    if (
      returnValue.length > 4 &&
      REVERT_REASON.compare(returnValue, 0, 4) === 0
    ) {
      try {
        // it is possible for the `returnValue` to be gibberish that can't be
        // decoded. See: https://github.com/trufflesuite/ganache-core/pull/452
        reason = rawDecode(["bytes"], returnValue.slice(4))[0].toString();
        message += " " + reason;
      } catch {
        // ignore error since reason string recover is impossible
        reason = null;
      }
    } else {
      reason = null;
    }

    this.message = message;
    this.data = {
      hash: hash,
      programCounter: execResult.runState.programCounter,
      result:
        returnType === RETURN_TYPES.TRANSACTION_HASH
          ? hash
          : Data.from(returnValue || "0x").toString(),
      reason: reason,
      message: error
    };
  }
}
