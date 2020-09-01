import { EVMResult } from "ethereumjs-vm/dist/evm/evm";
import Transaction from "./transaction";
import { VM_EXCEPTION } from "./errors";
import { Data } from "@ganache/utils";
import { rawDecode } from "ethereumjs-abi";
import CodedError, { ErrorCodes } from "./coded-error";

const REVERT_REASON = Buffer.from("08c379a0", "hex"); // keccak("Error(string)").slice(0, 4)

export enum RETURN_TYPES {
  TRANSACTION_HASH,
  RETURN_VALUE
}

export default class ExecutionError extends CodedError {
  public code: typeof ErrorCodes.INVALID_INPUT;
  public data: {
    hash: string,
    programCounter: number,
    result: string,
    reason?: string,
    message: string
  }
  constructor(transaction: Transaction, result: EVMResult, returnType: RETURN_TYPES) {
    const execResult = result.execResult;
    const error = execResult.exceptionError.error;
    let message = VM_EXCEPTION + error;

    super(message, ErrorCodes.INVALID_INPUT);

    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;

    const returnValue = execResult.returnValue;
    const hash = Data.from(transaction.hash(), 32).toString();
    let reason: string | null;
    if (returnValue.length > 4 && REVERT_REASON.compare(returnValue, 0, 4) === 0) {
      reason = rawDecode(["bytes"], returnValue.slice(4))[0].toString();
      message += " " + reason;
    } else {
      reason = null;
    }

    this.message = message;
    this.data = {
      hash: hash,
      programCounter: execResult.runState.programCounter,
      result: returnType === RETURN_TYPES.TRANSACTION_HASH ? hash : Data.from(returnValue || "0x").toString(),
      reason: reason,
      message: error
    };
  }
}
