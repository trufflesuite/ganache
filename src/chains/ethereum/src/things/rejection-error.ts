export default class RejectionError extends Error {
  public code: -32000;
  public data: {
    result: string
  }
  constructor(result: string, message: string) {
    super();

    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;

    this.data = {
      result
    }
    this.message = message;
    this.code = -32000;
  }
}