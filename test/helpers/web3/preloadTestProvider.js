const initializeTestProvider = require("./initializeTestProvider");

const preloadTestProvider = (options = {}) => {
  let context = {};
  before("Setting up web3", async function() {
    this.timeout(10000);
    const { accounts, provider, web3 } = await initializeTestProvider(options);

    Object.assign(context, {
      accounts,
      provider,
      web3
    });
  });

  return context;
};

module.exports = preloadTestProvider;
