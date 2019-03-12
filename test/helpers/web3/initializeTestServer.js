const Ganache = require(process.env.TEST_BUILD
  ? "../../../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../../../index.js");
const Web3 = require("web3");

const intiailizeTestServer = (tests, port = 12345) => {
  describe("Server:", function() {
    const web3 = new Web3();
    const port = 12345;
    let server;

    before("Initialize Ganache server", function(done) {
      server = Ganache.server({});
      server.listen(port, function() {
        web3.setProvider(new Web3.providers.HttpProvider("http://localhost:" + port));
        done();
      });
    });

    after("Shutdown server", function(done) {
      server.close(done);
    });

    tests(web3);
  });
};

module.exports = intiailizeTestServer;
