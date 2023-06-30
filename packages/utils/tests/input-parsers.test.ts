import assert from "assert";
import {
  parseAndValidateStringInput,
  parseAndValidateBigIntInput,
  parseAndValidateNumberInput
} from "../src/things/json-rpc/input-parsers";

describe("json-rpc-input-parsers", () => {
  describe("parseAndValidateStringInput()", () => {
    ["-0x123", "0xg", "123", "0.123", "-123", "0x0.1", "0x-1", "-0x1"].forEach(
      input => {
        it(`should reject invalid value: ${input}`, () => {
          assert.throws(() => parseAndValidateStringInput(input));
        });
      }
    );

    [
      ["0x", []],
      ["0x1", [0x01]],
      ["0x01", [0x01]],
      ["0x00000000", [0x00, 0x00, 0x00, 0x00]],
      ["0x12345678", [0x12, 0x34, 0x56, 0x78]],
      ["0x123456789abcdef", [0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]],
      ["0x123456789ABCDEF", [0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]],
      [
        "0x000000000000000001",
        [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]
      ]
    ].forEach(([input, expectedByteArray]) => {
      it(`should return the correct buffer for special case: ${input}`, () => {
        const expected = Buffer.from(expectedByteArray);
        const actual = parseAndValidateStringInput(<string>input);
        assert.deepStrictEqual(actual, expected);
      });
    });

    it("should return the correct buffer for every length up to 50 bytes", () => {
      for (let i = "0"; i.length <= 100; i = i + (i.length % 16).toString(16)) {
        const evenLengthHexString = i.length & 1 ? `0${i}` : i;
        const expected = Buffer.from(evenLengthHexString, "hex");
        const input = `0x${i}`;
        const actual = parseAndValidateStringInput(input);
        assert.deepStrictEqual(
          actual,
          expected,
          `incorrect value for input ${input}, expected: 0x${expected.toString(
            "hex"
          )}, got: 0x${actual.toString("hex")}`
        );
      }
    });
  });

  describe("parseAndValidateNumberInput()", () => {
    [-1, Infinity, -Infinity, NaN, 0.1].forEach(input => {
      it(`should reject invalid value: ${input}`, () => {
        assert.throws(() => parseAndValidateNumberInput(input));
      });
    });

    [
      [0, []],
      [1, [0x01]],
      [Number.MAX_SAFE_INTEGER, [0x1f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]],
      [Number.MAX_SAFE_INTEGER + 1, [0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]]
    ].forEach(([input, expectedByteArray]) => {
      it(`should return the correct buffer for special case: ${input}`, () => {
        const expected = Buffer.from(<any>expectedByteArray);
        const actual = parseAndValidateNumberInput(<number>input);
        assert.deepStrictEqual(actual, expected);
      });
    });

    it("should return the current buffer for lengths up to 6 bytes", () => {
      // after Number.MAX_SAFE_INTEGER (which is 7 bytes long) we will start to lose precision
      for (let i = "1"; i.length <= 12; i = i + (i.length % 16).toString(16)) {
        const evenLengthHexString = i.length & 1 ? `0${i}` : i;
        const input = parseInt(i, 16);
        const expected = Buffer.from(evenLengthHexString, "hex");
        const actual = parseAndValidateNumberInput(input);
        assert.deepStrictEqual(
          actual,
          expected,
          `incorrect value for input 0x${input.toString(
            16
          )}, expected: 0x${expected.toString("hex")}, got: 0x${actual.toString(
            "hex"
          )}`
        );
      }
    });
  });

  describe("parseAndValidateBigIntInput()", () => {
    [-1n].forEach(input => {
      it(`should reject invalid value: ${input}`, () => {
        assert.throws(() => parseAndValidateBigIntInput(input));
      });
    });

    [
      [0n, []],
      [1n, [0x01]]
    ].forEach(([input, expectedByteArray]) => {
      it(`should return the correct buffer for special case: ${input}`, () => {
        const expected = Buffer.from(<any>expectedByteArray);
        const actual = parseAndValidateBigIntInput(<bigint>input);
        assert.deepStrictEqual(actual, expected);
      });
    });

    it("should return the correct buffer for every length up to 50 bytes", () => {
      for (let i = "1"; i.length <= 100; i = i + (i.length % 16).toString(16)) {
        const evenLengthHexString = i.length & 1 ? `0${i}` : i;
        const expected = Buffer.from(evenLengthHexString, "hex");
        const input = BigInt(`0x${evenLengthHexString}`);
        const actual = parseAndValidateBigIntInput(input);
        assert.deepStrictEqual(
          actual,
          expected,
          `incorrect value for input 0x${input.toString(
            16
          )}, expected: 0x${expected.toString("hex")}, got: 0x${actual.toString(
            "hex"
          )}`
        );
      }
    });
  });
});
