const assert = require("assert-match");
const { gte, lte } = require("assert-match/matchers");
const initializeTestProvider = require("./helpers/web3/initializeTestProvider");

describe("Time adjustment", function() {
  let context, timestampBeforeJump;
  const SECONDSTOJUMP = 5 * 60 * 60;
  const startTime = new Date("Wed Aug 24 2016 00:00:00 GMT-0700 (PDT)");

  before("Setting up accounts and provider", async function() {
    context = await initializeTestProvider({
      time: startTime
    });
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

  it("should jump 5 hours", async function() {
    this.timeout(5000); // this is timing out on travis for some reason :-(
    const { web3, send } = context;

    // Adjust time
    await send("evm_increaseTime", SECONDSTOJUMP);

    // Mine a block so new time is recorded.
    await send("evm_mine", null);

    const { timestamp } = await web3.eth.getBlock("latest");
    const secondsJumped = timestamp - timestampBeforeJump;

    // Somehow it jumps an extra 18 seconds, ish, when run inside the whole
    // test suite. It might have something to do with when the before block
    // runs and when the test runs. Likely the last block didn't occur for
    // awhile.
    assert(secondsJumped >= SECONDSTOJUMP);
  });

  it("should mine a block at the given timestamp", async function() {
    const { web3, send } = context;

    // Adjust time
    const expectedMinedTimestamp = 1000000;

    await send("evm_mine", expectedMinedTimestamp);

    const { timestamp } = await web3.eth.getBlock("latest");
    assert.strictEqual(timestamp, expectedMinedTimestamp);
  });

  it("should revert time adjustments when snapshot is reverted", async function() {
    const { provider, send } = context;

    const originalTimeAdjustment = provider.manager.state.blockchain.timeAdjustment;

    await send("evm_snapshot");
    // jump forward another 5 hours
    await send("evm_increaseTime", SECONDSTOJUMP);

    const currentTimeAdjustment = provider.manager.state.blockchain.timeAdjustment;
    assert.strictEqual(currentTimeAdjustment, originalTimeAdjustment + SECONDSTOJUMP);

    // Mine a block so new time is recorded.
    await send("evm_mine", null);
    await send("evm_revert", 1);

    const revertedTimeAdjustment = provider.manager.state.blockchain.timeAdjustment;
    assert.strictEqual(revertedTimeAdjustment, originalTimeAdjustment);
  });

  it("should allow setting of time", async function() {
    const { web3, send } = context;

    const { timestamp: previousTime } = await web3.eth.getBlock("latest");

    await send("evm_setTime", new Date(previousTime - SECONDSTOJUMP));

    // Mine a block so new time is recorded.
    await send("evm_mine", null);

    const { timestamp } = await web3.eth.getBlock("latest");
    assert(previousTime > timestamp);
  });
});
