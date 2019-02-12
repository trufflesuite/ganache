const to = require("../../../lib/utils/to");

/**
 * Converts a string into a hex string
 * @param {string} message
 * @returns {string} Hex representation of the `message`
 */
const toBytesHexString = (message) => {
  const bytes = Array.prototype.map.call(message, (character) => {
    return character.codePointAt(0);
  });

  return to.hex(Buffer.from(bytes));
};

module.exports = toBytesHexString;
