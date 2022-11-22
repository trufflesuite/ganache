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
        [1000, "1 second"],
        [1001, "1 second"],
        [-1000, "In 1 second"],
        [-1001, "In 1 second"],
        [2000, "2 seconds"],
        [60000, "1 minute"],
        [62000, "1 minute, 2 seconds"],
        [1000000, "16 minutes, 40 seconds"],
        [-171906000, "In 1 day, 23 hours, 45 minutes, 6 seconds"],
        [171906000, "1 day, 23 hours, 45 minutes, 6 seconds"]
      ];

      durations.forEach(duration => {
        const [ms, formatted] = duration;
        it(`should format an input of ${ms} as "${formatted}"`, () => {
          const result = formatUptime(ms as number);
          assert.strictEqual(result, formatted);
        });
      });
    });
  });
});
