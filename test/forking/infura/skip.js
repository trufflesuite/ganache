module.exports = function shouldSkip() {
  return typeof process.env.INFURA_KEY === "undefined" || process.env.INFURA_KEY === "";
};
