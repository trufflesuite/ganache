var utils = require("ethereumjs-util");

module.exports = {
  // Note: Do not use to.hex() when you really mean utils.addHexPrefix().
  hex: function(val) {
    if (typeof val == "string") {
      if (val.indexOf("0x") == 0) {
        return val;
      } else {
        val = new utils.BN(val);
      }
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

  hexWithoutLeadingZeroes: function(val) {
    val = this.hex(val).replace("0x", "").replace(/^0+/, "");
    return utils.addHexPrefix(val == "" ? "0" : val);
  },

  hexWithEvenLength: function(val, width) {
    val = this.hex(val).replace("0x", "");
    if (val.length % 2 == 1) {
      val = "0" + val;
    }
    return utils.addHexPrefix(val);
  },


  hexWithLeftPadding: function(val, width) {
    val = this.hex(val).replace("0x", "");
    while (val.length < width) {
      val = "0" + val;
    }
    return utils.addHexPrefix(val);
  },

  number: function(val) {
    return utils.bufferToInt(utils.toBuffer(val));
  }
};
