const assert = require("assert");
const { rpcQuantityHexString } = require("../../../lib/utils/to.js");

const noLeadingZeros = (method, result, path) => {
  if (!path) {
    path = "result";
  }

  if (typeof result === "string") {
    if (/^0x/.test(result)) {
      const asHex = rpcQuantityHexString(result);
      assert.strictEqual(result, asHex, `Field ${path} in ${method} response has leading zeroes.`);
    }
  } else if (typeof result === "object") {
    for (var key in result) {
      if (result.hasOwnProperty(key)) {
        if (Array.isArray(result)) {
          path += [key];
        } else {
          path += "." + key;
        }
        noLeadingZeros(method, result[key], path + (path ? "." : "") + key);
      }
    }
  }
};

module.exports = noLeadingZeros;
