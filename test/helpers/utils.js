module.exports = {
  sleep: async(milliseconds) => {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
};
