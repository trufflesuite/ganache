const to = require("../../../lib/utils/to.js");

const toBytes = (s) => {
  const bytes = Array.prototype.map.call(s, (c) => {
    return c.codePointAt(0);
  });

  return to.hex(Buffer.from(bytes));
};

module.exports = toBytes;
