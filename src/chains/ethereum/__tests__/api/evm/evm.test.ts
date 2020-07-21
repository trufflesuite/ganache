import getProvider from "../../helpers/getProvider";
import assert from "assert";

function between(x: number, min: number, max: number) {
  return x >= min && x <= max;
}

describe("api", () => {
  describe("evm", () => {
    describe("evm_setTime", () => {
      it("should set the time correctly when difference is greater than 2**31", async () => {
        // this test is here to prevent a dev from "optimizing" rounding to use
        // bitwise tricks since those won't work on numbers greater than 2**31.

        const provider = await getProvider();
        // Multiple by 1000 because ganache keeps track of time in seconds
        const bin32 = (2**31) * 1000;
        const now = Date.now();
        // fast forward time by bin32, plus 2 seconds, in case testing is slow
        const newTime = bin32 + now + 2;

        const timeAdjustment = await provider.send("evm_setTime", [newTime]);
        
        // it should return `newTime - now`, floored to the nearest second
        const baseLineOffset = Math.floor((newTime - now) / 1000);
        assert(between(timeAdjustment, baseLineOffset - 2, baseLineOffset + 2));
      });
    });

    describe("evm_increaseTime", () => {
      it("should return the `timeAdjustment` value via `evm_increaseTime`", async () => {
        const provider = await getProvider();
        const seconds = 10;
        const timeAdjustment = await provider.send("evm_increaseTime", [seconds]);
        assert.strictEqual(timeAdjustment, seconds);
      });
    });

    describe("evm_mine", () => {
      it("should mine a block on demand", async () => {
        const provider = await getProvider();
        const initialBlock = parseInt(await provider.send("eth_blockNumber"));
        await provider.send("evm_mine");
        const currentBlock = parseInt(await provider.send("eth_blockNumber"));
        assert.strictEqual(currentBlock, initialBlock + 1);
      });

      it("should mine a block on demand at the specified timestamp", async () => {
        const startDate = new Date(2019, 3, 15);
        const miningTimestamp = Math.floor((new Date(2020, 3, 15).getTime() / 1000));
        const provider = await getProvider({time: startDate});
        await provider.send("evm_mine", [miningTimestamp]);
        const currentBlock = await provider.send("eth_getBlockByNumber", ["latest"]);
        assert.strictEqual(parseInt(currentBlock.timestamp), miningTimestamp);
      });

      it("should mine a block even when mining is stopped", async () => {
        const provider = await getProvider();
        const initialBlock = parseInt(await provider.send("eth_blockNumber"));
        await provider.send("miner_stop");
        await provider.send("evm_mine");
        const currentBlock = parseInt(await provider.send("eth_blockNumber"));
        assert.strictEqual(currentBlock, initialBlock + 1);
      });

      it("should mine a block when in interval mode", async () => {
        const provider = await getProvider({blockTime: 1000});
        const initialBlock = parseInt(await provider.send("eth_blockNumber"));
        await provider.send("evm_mine");
        const currentBlock = parseInt(await provider.send("eth_blockNumber"));
        assert.strictEqual(currentBlock, initialBlock + 1);
      });

      it("should mine a block when in interval mode even when mining is stopped", async () => {
        const provider = await getProvider({blockTime: 1000});
        const initialBlock = parseInt(await provider.send("eth_blockNumber"));
        await provider.send("miner_stop");
        await provider.send("evm_mine");
        const currentBlock = parseInt(await provider.send("eth_blockNumber"));
        assert.strictEqual(currentBlock, initialBlock + 1);
      });
    });
  });
});
