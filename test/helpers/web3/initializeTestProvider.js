const Ganache = require(process.env.TEST_BUILD
  ? "../../../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../../../index.js");
const Web3 = require("web3");
const generateSend = require("../utils/rpc");

/**
 * Initialize Ganache provider with `options`
 * @param {Object} options - Ganache provider options
 * @returns {Object} accounts, provider, send, web3 Object
 */
const initializeTestProvider = async(options = {}, provider = null) => {
  provider = provider || options.provider || Ganache.provider(options);
  const send = generateSend(provider);
  const web3 = new Web3(provider);
  const accounts = await web3.eth.getAccounts();

  return {
    accounts,
    provider,
    send,
    web3
  };
};

module.exports = initializeTestProvider;
