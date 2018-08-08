var Ganache = require("../index.js");
var assert = require('assert-match');
var matchers = require('assert-match/matchers');
var gte = matchers.gte
var lte = matchers.lte
var Web3 = require("web3");

describe('Time adjustment', function() {
  var startTime = new Date("Wed Aug 24 2016 00:00:00 GMT-0700 (PDT)");
  var provider = Ganache.provider({
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
      // give ourselves a 25ms window for this to succeed
      let acceptableStartTime = startTime / 1000 | 0;
      let acceptableEndTime = acceptableStartTime + 25;
      assert.deepEqual(result.timestamp, gte(acceptableStartTime));
      assert.deepEqual(result.timestamp, lte(acceptableEndTime));
      done();
    });
  });

  it('should jump 5 hours', function(done) {
    this.timeout(5000) // this is timing out on travis for some reason :-(
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

  it('should revert time adjustments when snapshot is reverted', function(done) {
    // Adjust time
    web3.eth.getBlock('latest', function(err, block){
      if(err) return done(err)
      var previousBlockTime = block.timestamp
      var originalTimeAdjustment = provider.manager.state.blockchain.timeAdjustment

      send("evm_snapshot", function(err, result) {
        // jump forward another 5 hours
        send("evm_increaseTime", [secondsToJump], function(err, result) {
          if (err) return done(err);

          var currentTimeAdjustment = provider.manager.state.blockchain.timeAdjustment
          assert.equal(currentTimeAdjustment, originalTimeAdjustment + secondsToJump)

          // Mine a block so new time is recorded.
          send("evm_mine", function(err, result) {
            if (err) return done(err);

            send("evm_revert", [1], function(err, result) {
              var revertedTimeAdjustment = provider.manager.state.blockchain.timeAdjustment
              assert.equal(revertedTimeAdjustment, originalTimeAdjustment);
              done()
            })
          })
        })
      })
    })
  })
})
