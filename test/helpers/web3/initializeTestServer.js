const Ganache = require(process.env.TEST_BUILD
  ? "../../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../../../index.js");
const Web3 = require("web3");

/**
 * Initialize Ganache provider with `options`
 * @param {Object} options - Ganache provider options
 * @returns {Object} accounts, provider, web3 Object
 */
const initializeTestServer = (tests, options = { port: 12345 }) => {
  return function(done) {
    var web3 = new Web3();
    var server;

    before("Initialize Ganache server", function(done) {
      server = Ganache.server(options);
      server.listen(options.port, function() {
        web3.setProvider(new Web3.providers.HttpProvider("http://localhost:" + options.port));
        done();
      });
    });

    after("Shutdown server", function(done) {
      server.close(done);
    });

    tests(web3);
  };
};

module.exports = initializeTestServer;
