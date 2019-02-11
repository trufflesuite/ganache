const to = require("../../../lib/utils/to");

const toBytesHexString = (message) => {
  const bytes = Array.prototype.map.call(message, (character) => {
    return character.codePointAt(0);
  });

  return to.hex(Buffer.from(bytes));
};

module.exports = toBytesHexString;
