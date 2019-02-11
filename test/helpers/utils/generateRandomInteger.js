/**
 * Generates a random integer
 * @param {Number} max Maximum integer to randomly generate
 * @returns {Number} Returns a random integer between 0 and `max`
 */
const randomInteger = (max) => {
  return Math.floor(Math.random() * (max + 1));
};

module.exports = randomInteger;
