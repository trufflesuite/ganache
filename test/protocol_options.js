var Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
var assert = require("assert-match");

describe("Protocol Options", function() {
  var startTime = new Date("Wed Aug 24 2016 00:00:00 GMT-0700 (PDT)");
  var provider = Ganache.provider({
    time: startTime
  });

  var protocolOptionsBeforeChange;

  function send(method, params, callback) {
    if (typeof params === "function") {
      callback = params;
      params = [];
    }

    provider.send(
      {
        jsonrpc: "2.0",
        method: method,
        params: params || [],
        id: new Date().getTime()
      },
      callback
    );
  }

  before("get current protocol options", function(done) {
    protocolOptionsBeforeChange = {
      gasLimit: provider.manager.state.blockchain.blockGasLimit
    };
    done();
  });

  it("should change the protocol options", function(done) {
    const gasLimit = "0x4201b8";
    const options = {
      gasLimit
    };

    send("ganache_setProtocolOptions", [options], function(err, response) {
      if (err) {
        return done(err);
      }
      const { result } = response;

      assert(result !== protocolOptionsBeforeChange.gasLimit, "should have changed the protocol block gas limit");
      assert.strictEqual(
        result,
        gasLimit,
        "should have changed the protocol block gas limit to the specified gasLimit"
      );
      done();
    });
  });
});
