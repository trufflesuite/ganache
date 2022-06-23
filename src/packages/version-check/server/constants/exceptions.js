export function EXCEPTION_UNAUTHORIZED(reason) {
  this.status = 401;
  this.statusText = "Unauthorized";
  this.reason = reason;
}

export function EXCEPTION_BAD_REQUEST(reason) {
  this.status = 400;
  this.statusText = "Bad Request";
  this.reason = reason;
}
