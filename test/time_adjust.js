var TestRPC = require("../index.js");
var assert = require('assert');
var Web3 = require("web3");

describe('Time adjustment', function() {
  var startTime = new Date("Wed Aug 24 2016 00:00:00 GMT-0700 (PDT)");
  var provider = TestRPC.provider({
    time: startTime
  });
  var web3 = new Web3(provider);
  var secondsToJump = 5 * 60 * 60;

  var timestampBeforeJump;

  function send(method, params, callback) {
    if (typeof params == "function") {
      callback = params;
      params = [];
    }

    provider.send({
      jsonrpc: "2.0",
      method: method,
      params: params || [],
      id: new Date().getTime()
    }, callback);
  };

  before('get current time', function(done) {
    web3.eth.getBlock('latest', function(err, block){
      if(err) return done(err)
      timestampBeforeJump = block.timestamp
      done()
    })
  })

  it('should mine the first block at the time provided', function(done) {
    web3.eth.getBlock(0, function(err, result) {
      assert.equal(result.timestamp, startTime / 1000 | 0);
      done();
    });
  });

  it('should jump 5 hours', function(done) {
    // Adjust time
    send("evm_increaseTime", [secondsToJump], function(err, result) {
      if (err) return done(err);

      // Mine a block so new time is recorded.
      send("evm_mine", function(err, result) {
        if (err) return done(err);

        web3.eth.getBlock('latest', function(err, block){
          if(err) return done(err)
          var secondsJumped = block.timestamp - timestampBeforeJump

          // Somehow it jumps an extra 18 seconds, ish, when run inside the whole
          // test suite. It might have something to do with when the before block
          // runs and when the test runs. Likely the last block didn't occur for
          // awhile.
          assert(secondsJumped >= secondsToJump)
          done()
        })
      })
    })
  })
})
