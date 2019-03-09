const assert = require("assert-match");
const { gte, lte } = require("assert-match/matchers");
const initializeTestProvider = require("./helpers/web3/initializeTestProvider");
const generateSend = require("./helpers/utils/rpcWithCallback");

describe("Time adjustment", function() {
  let context, send, timestampBeforeJump;
  const SECONDSTOJUMP = 5 * 60 * 60;
  const startTime = new Date("Wed Aug 24 2016 00:00:00 GMT-0700 (PDT)");

  before("Setting up accounts and provider", async function() {
    context = await initializeTestProvider({
      time: startTime
    });

    send = generateSend(context.provider);
  });

  before("get current time", async function() {
    const { web3 } = context;

    const { timestamp } = await web3.eth.getBlock("latest");
    timestampBeforeJump = timestamp;
  });

  it("should mine the first block at the time provided", async function() {
    const { web3 } = context;

    const { timestamp } = await web3.eth.getBlock(0);

    // give ourselves a 25ms window for this to succeed
    const acceptableStartTime = (startTime / 1000) | 0;
    const acceptableEndTime = acceptableStartTime + 25;
    assert.deepEqual(timestamp, gte(acceptableStartTime));
    assert.deepEqual(timestamp, lte(acceptableEndTime));
  });

  it("should jump 5 hours", function(done) {
    this.timeout(5000); // this is timing out on travis for some reason :-(
    const { web3 } = context;

    // Adjust time
    send("evm_increaseTime", [SECONDSTOJUMP], function(err) {
      if (err) {
        return done(err);
      }

      // Mine a block so new time is recorded.
      send("evm_mine", async function(err) {
        if (err) {
          return done(err);
        }

        const { timestamp } = await web3.eth.getBlock("latest");
        const secondsJumped = timestamp - timestampBeforeJump;

        // Somehow it jumps an extra 18 seconds, ish, when run inside the whole
        // test suite. It might have something to do with when the before block
        // runs and when the test runs. Likely the last block didn't occur for
        // awhile.
        assert(secondsJumped >= SECONDSTOJUMP);
        done();
      });
    });
  });

  it("should mine a block at the given timestamp", function(done) {
    const { web3 } = context;

    // Adjust time
    const expectedMinedTimestamp = 1000000;

    send("evm_mine", [expectedMinedTimestamp], async function(err) {
      if (err) {
        return done(err);
      }

      const { timestamp } = await web3.eth.getBlock("latest");
      assert(timestamp === expectedMinedTimestamp);
      done();
    });
  });

  it("should revert time adjustments when snapshot is reverted", function(done) {
    const { provider, web3 } = context;

    // Adjust time
    web3.eth.getBlock("latest", function(err, block) {
      if (err) {
        return done(err);
      }
      const originalTimeAdjustment = provider.manager.state.blockchain.timeAdjustment;

      send("evm_snapshot", function(err) {
        if (err) {
          return done(err);
        }
        // jump forward another 5 hours
        send("evm_increaseTime", [SECONDSTOJUMP], function(err) {
          if (err) {
            return done(err);
          }

          const currentTimeAdjustment = provider.manager.state.blockchain.timeAdjustment;
          assert.equal(currentTimeAdjustment, originalTimeAdjustment + SECONDSTOJUMP);

          // Mine a block so new time is recorded.
          send("evm_mine", function(err) {
            if (err) {
              return done(err);
            }

            send("evm_revert", [1], function(err) {
              if (err) {
                return done(err);
              }
              const revertedTimeAdjustment = provider.manager.state.blockchain.timeAdjustment;
              assert.equal(revertedTimeAdjustment, originalTimeAdjustment);
              done();
            });
          });
        });
      });
    });
  });

  it("should allow setting of time", function(done) {
    const { web3 } = context;

    web3.eth.getBlock("latest", function(err, block) {
      if (err) {
        return done(err);
      }

      const previousTime = block.timestamp;

      send("evm_setTime", [new Date(previousTime - SECONDSTOJUMP)], function(err) {
        if (err) {
          return done(err);
        }

        // Mine a block so new time is recorded.
        send("evm_mine", async function(err) {
          if (err) {
            return done(err);
          }

          const { timestamp } = await web3.eth.getBlock("latest");
          assert(previousTime > timestamp);
          done();
        });
      });
    });
  });
});
