import CodedError, { ErrorCodes } from "./coded-error";

export default class RejectionError extends CodedError {
  public code: typeof ErrorCodes.INVALID_INPUT;
  public data: {
    result: string
  }
  constructor(result: string, message: string) {
    super(message, ErrorCodes.INVALID_INPUT);

    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;

    this.data = {
      result
    }
  }
}