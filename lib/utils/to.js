var utils = require("ethereumjs-util");

module.exports = {
  // Note: Do not use to.hex() when you really mean utils.addHexPrefix().
  hex: function(val) {
    if (typeof val == "string") {
      if (val === "0x") {
        return "0x0";
      } else if (val.indexOf("0x") == 0) {
        return val;
      } else {
        val = new utils.BN(val);
      }
    }

    if (typeof val == "boolean") {
      val = val ? 1 : 0;
    }

    if (typeof val == "number") {
      val = utils.intToHex(val);
    }

    // Support Buffer, BigInteger and BN library
    // Hint: BN is used in ethereumjs
    if (typeof val == "object") {
      val = val.toString("hex");

      if (val == "") {
        val = "0";
      }
    }

    return utils.addHexPrefix(val);
  },

  rpcQuantityHexString: function(val) {
    val = this.hex(val);
    val = "0x" + val.replace("0x", "").replace(/^0+/, "");

    if (val == "0x") {
      val = "0x0";
    }

    return val;
  },

  rpcDataHexString: function(val, length) {
    if(typeof(length) == "number") {
      val = this.hex(val).replace("0x", "");

      val = new Array(length-val.length).fill("0").join("") + val;
    } else {
      if(val.length == 0) {
        return "0x";
      }
      val = this.hex(val).replace("0x", "");

      if(val.length % 2 != 0) {
        val = "0" + val;
      }
    }
    return "0x" + val;
  },

  hexWithZeroPadding: function(val) {
    val = this.hex(val);
    const digits = val.replace("0x", "");
    if (digits.length & 0x1) {
      return "0x0" + digits;
    }
    return val;
  },

  number: function(val) {
    if (typeof val == "number") {
      return val;
    }
    if (typeof val == "string") {
      if (val.indexOf('0x') != 0) {
        return parseInt(val)
      }
    }
    return utils.bufferToInt(utils.toBuffer(val));
  }
};
