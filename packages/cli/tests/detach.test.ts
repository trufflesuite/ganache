import assert from "assert";
import { formatUptime, levenshteinDistance } from "../src/detach";

describe("@ganache/cli", () => {
  describe("detach", () => {
    describe("levenshteinDistance", () => {
      it("returns 0 for identical strings", () => {
        const a = "hello";
        const b = "hello";
        const result = levenshteinDistance(a, b);

        assert.strictEqual(result, 0);
      });

      it("returns correct distance for different strings", () => {
        const a = "hello";
        const b = "world";
        const result = levenshteinDistance(a, b);

        assert.strictEqual(result, 4);
      });

      it("returns correct distance for strings of different lengths", () => {
        const a = "hello";
        const b = "hi";
        const result = levenshteinDistance(a, b);

        assert.strictEqual(result, 4);
      });

      it("returns correct distance for strings with additions", () => {
        const a = "hello";
        const b = "heBlAlo";
        const result = levenshteinDistance(a, b);

        assert.strictEqual(result, 2);
      });

      it("returns correct distance for strings with subtractions", () => {
        const a = "hello";
        const b = "hll";
        const result = levenshteinDistance(a, b);

        assert.strictEqual(result, 2);
      });

      it("returns correct distance for strings with substitutions", () => {
        const a = "hello";
        const b = "hAlAo";
        const result = levenshteinDistance(a, b);

        assert.strictEqual(result, 2);
      });

      it("returns correct distance for strings with addition, subtraction and substitution", () => {
        const a = "hello world";
        const b = "helloo wolB";
        const result = levenshteinDistance(a, b);

        assert.strictEqual(result, 3);
      });
    });

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
