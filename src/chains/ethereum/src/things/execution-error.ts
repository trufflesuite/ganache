import { EVMResult } from "ethereumjs-vm/dist/evm/evm";
import Transaction from "./transaction";
import { VM_EXCEPTION } from "./errors";
import { Data } from "@ganache/utils";
import { rawDecode } from "ethereumjs-abi";

const REVERT_REASON = Buffer.from("08c379a0", "hex"); // keccak("Error(string)").slice(0, 4)

export enum RETURN_TYPES {
  TRANSACTION_HASH,
  RETURN_VALUE
}

export default class ExecutionError extends Error {
  public code: -32000;
  public data: {
    hash: string,
    programCounter: number,
    result: string,
    reason?: string
  }
  constructor(transaction: Transaction, result: EVMResult, returnType: RETURN_TYPES) {
    super();

    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;

    const execResult = result.execResult;
    let message = VM_EXCEPTION + execResult.exceptionError.error;
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
    this.code = -32000;
    this.data = {
      hash: hash,
      programCounter: execResult.runState.programCounter,
      result: returnType === RETURN_TYPES.TRANSACTION_HASH ? hash : Data.from(returnValue || "0x").toString(),
      reason: reason
    };
  }
}
