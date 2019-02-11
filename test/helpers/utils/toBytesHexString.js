const toHex = require("./toHex");

const toBytesHexString = (message) => {
  const bytes = Array.prototype.map.call(message, (character) => {
    return character.codePointAt(0);
  });

  return toHex(Buffer.from(bytes));
};

module.exports = toBytesHexString;
