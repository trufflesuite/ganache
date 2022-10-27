import assert from "assert";
import sinon from "sinon";
import { min, max, findInsertPosition } from "../";

const BIGINT_ERROR =
  "bigint: Failed to load bindings, pure JS will be used (try npm run rebuild?)";

describe("@ganache/utils", () => {
  describe("bigint-buffer library", () => {
    let spy: any;
    before(() => {
      spy = sinon.spy(console, "warn");
    });

    it("loads without warnings", () => {
      // make sure we're actually loading this module and not using a cached version
      delete require.cache[require.resolve("@trufflesuite/bigint-buffer")];
      // if prebuilt binaries aren't properly installed, we'll get a warning from
      // this lib saying that the JS fallback is being used.
      require("@trufflesuite/bigint-buffer");
      // so we'll spy on console.warn to ensure that our bigint-buffer warning
      // is never called when loading this library
      assert.strictEqual(spy.withArgs(BIGINT_ERROR).callCount, 0);
    });

    after(() => {
      spy.restore();
    });
  });
  describe("min-max", () => {
    const ascending = [0, 1, 2, 3, 4];
    const descending = [4, 3, 2, 1, 0];
    const mixedTypes = [0n, 1, 2, 3n, 4n];

    it("returns the min", () => {
      assert.strictEqual(min(...ascending), ascending[0]);
      assert.strictEqual(min(...descending), descending[descending.length - 1]);
      assert.strictEqual(min(...mixedTypes), mixedTypes[0]);
    });
    it("returns the max", () => {
      assert.strictEqual(max(...ascending), ascending[ascending.length - 1]);
      assert.strictEqual(max(...descending), descending[0]);
      assert.strictEqual(max(...mixedTypes), mixedTypes[mixedTypes.length - 1]);
    });
  });

  /*
   * Nice piece of custom you got there, where'd yah get it?
   */
  describe("find-insert-position", () => {
    const compareAscendingBoolean = (a: number, b: number): boolean => a < b;
    const compareAscendingNumber = (a: number, b: number): number => a - b;

    const totalNumbersToTest = 1000;
    const numbersToTest = Array.from({ length: totalNumbersToTest }).map(_ =>
      Math.round(Math.random() * 10000)
    );

    function stockSortAndFilter(startingNumber: number, maxResult: number) {
      const keys: number[] = [];
      numbersToTest.forEach(number => {
        // ignore anything that comes before our starting point
        if (startingNumber > number) return;

        // #4 - sort and filter keys
        // insert the key exactly where it needs to go in the array
        const position = findInsertPosition(
          keys,
          number,
          compareAscendingBoolean
        );
        // ignore if the value couldn't possibly be relevant
        if (position > maxResult) return;
        keys.splice(position, 0, number);
      });
      return keys;
    }

    function stockRangeAt(startingNumber: number, maxResult: number) {
      return stockSortAndFilter(startingNumber, maxResult).slice(0, maxResult);
    }

    function customRangeAt(startingNumber: number, maxResult: number) {
      return customSortAndFilter(startingNumber, maxResult).slice(0, maxResult);
    }
    function customSortAndFilter(startingNumber: number, maxResult: number) {
      const keys: number[] = [];
      numbersToTest.forEach(number => {
        // ignore anything that comes before our starting point
        if (startingNumber > number) return;

        // #4 - sort and filter keys
        // insert the key exactly where it needs to go in the array
        const position = findInsertPosition(
          keys,
          number,
          compareAscendingBoolean
        );
        // ignore if the value couldn't possibly be relevant
        if (position > maxResult) return;
        // This is the only line that changes
        if (keys.length === maxResult && number > keys[maxResult - 1]) return;
        keys.splice(position, 0, number);
      });
      return keys;
    }

    it("sorts an array of numbers as Array.sort with a comparable compare", () => {
      const numbers: number[] = [];

      numbersToTest.forEach(number => {
        const position = findInsertPosition(
          numbers,
          number,
          compareAscendingBoolean
        );

        numbers.splice(position, 0, number);
      });

      assert.deepStrictEqual(
        numbers,
        numbersToTest.sort(compareAscendingNumber)
      );
    });
    it("stockRangeAt range test", () => {
      const min = 5000;
      const max = 5;

      const stockStorage = stockRangeAt(min, max);

      const customStorage = customRangeAt(min, max);
      console.log(stockStorage);
      console.log(customStorage);
      assert.deepStrictEqual(stockStorage, customStorage);
    });
  });
});
