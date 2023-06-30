import assert from "assert";
import { formatUptime } from "../src/detach";

describe("@ganache/cli", () => {
  describe("detach", () => {
    describe("formatUptime()", () => {
      const durations: [number, string][] = [
        [0, "Just started"],
        [0.1, "Just started"],
        [1, "Just started"],
        [-1, "Just started"],
        [2, "Just started"],
        [1000, "1s"],
        [1001, "1s"],
        [-1000, "In 1s"],
        [-1001, "In 1s"],
        [2000, "2s"],
        [60000, "1m"],
        [62000, "1m 2s"],
        [1000000, "16m 40s"],
        [-171906000, "In 1d 23h 45m 6s"],
        [171906000, "1d 23h 45m 6s"]
      ];

      durations.forEach(duration => {
        const [ms, formatted] = duration;
        it(`should format an input of ${ms} as "${formatted}"`, () => {
          const result = formatUptime(ms);
          assert.strictEqual(result, formatted);
        });
      });
    });
  });
});
