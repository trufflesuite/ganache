class LevelUpOutOfRangeError extends Error {
  constructor(type, index, len) {
    const message = "LevelUpArrayAdapter named '" + type + "' index out of range: index " + index + "; length: " + len;
    super(message);
    this.name = `${this.constructor.name}:${type}`;
    this.type = type;
  }
}

class BlockOutOfRangeError extends LevelUpOutOfRangeError {
  constructor(index, len) {
    super("blocks", index, len);
  }
}

class RPCError extends Error {
  constructor(payload, code, message) {
    const msg = `RPCError: ${message}`;
    super(msg);
    this.id = payload.id;
    this.name = `${this.constructor.name}`;
    this.code = code;
    this.payload = payload;
  }
  format() {
    const self = this;
    return {
      jsonrpc: "2.0",
      id: self.id,
      error: {
        code: self.code,
        message: self.message
      }
    };
  }
}

class NotificationsUnsupportedRPCError extends RPCError {
  /**
   *
   * @param {object} payload contains request payload object
   */
  constructor(payload) {
    super(payload, -32000, "notifications not supported");
  }
}

module.exports = {
  LevelUpOutOfRangeError,
  BlockOutOfRangeError,
  RPCError,
  NotificationsUnsupportedRPCError
};
