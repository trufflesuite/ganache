import getProvider from "../../helpers/getProvider";
import assert from "assert";

function between(x: number, min: number, max: number) {
  return x >= min && x <= max;
}

describe("api", () => {
  describe("evm", () => {
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

    it("should return the `timeAdjustment` value via `evm_increaseTime`", async () => {
      const provider = await getProvider();
      const seconds = 10;
      const timeAdjustment = await provider.send("evm_increaseTime", [seconds]);
      assert.strictEqual(timeAdjustment, seconds);
    });
  });
});