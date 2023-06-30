import assert from "assert";
import { Data } from "../src/things/json-rpc/json-rpc-data";

// note: variations on non-buffer inputs are covered in the tests in ./input-parsers.test.ts

const testData = [
  //[input, toString(), toBuffer()]
  [Buffer.from([0x00]), "0x00", Buffer.from([0x00])],
  [Buffer.from([0x01]), "0x01", Buffer.from([0x01])],
  [
    Buffer.from([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]),
    "0x0123456789abcdef",
    Buffer.from([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef])
  ]
];

describe("json-rpc-data", () => {
  describe("constructor", () => {
    it("should create a Data instance", () => {
      const input = Buffer.alloc(0);
      const data = new Data(input);

      assert(data instanceof Data);
    });

    it("should create a Data instance with the specified `byteLength`", () => {
      const byteLength = 10;
      const input = "0x1234";
      const data = new Data(input, byteLength);

      // we can't directly access the instances length
      assert.strictEqual(data.toBuffer().length, byteLength);
    });
  });

  describe("from()", () => {
    it("should create a Data instance", () => {
      const input = Buffer.alloc(0);
      const data = Data.from(input);

      assert(data instanceof Data);
    });

    it("should create a Data instance with the specified `byteLength`", () => {
      const byteLength = 10;
      const input = "0x1234";
      const data = Data.from(input, byteLength);

      // we can't directly access the instances length
      assert.strictEqual(data.toBuffer().length, byteLength);
    });
  });

  describe("toString()", () => {
    it('should return "0x" for null-like inputs', () => {
      [null, undefined].forEach(input => {
        const result = new Data(input).toString();

        assert.strictEqual(result, "0x");
      });
    });

    testData.forEach(([input, expected]) => {
      it(`should stringify the input: 0x${(<Buffer>input).toString(
        "hex"
      )}`, () => {
        const result = new Data(<Buffer>input).toString();
        assert.strictEqual(result, expected);
      });
    });

    it("should truncate to a shorter byteLength", () => {
      const result = new Data(
        Buffer.from([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef])
      ).toString(1);
      assert.strictEqual(result, "0x01");
    });

    it("should pad to a longer byteLength", () => {
      const result = new Data(Buffer.from([0x01])).toString(10);
      assert.strictEqual(result, "0x00000000000000000001");
    });

    it("should prefer the specified byteLength, over the value provided to the constructor", () => {
      const byteLength = 10;
      const data = new Data("0x01", 2);

      const result = data.toString(byteLength);
      assert.strictEqual(result, "0x00000000000000000001");
    });
  });

  describe("toBuffer()", () => {
    it("should return an empty buffer for an empty buffer input", () => {
      const result = new Data(Buffer.alloc(0)).toBuffer();
      assert.deepStrictEqual(result, Buffer.alloc(0));
    });

    it("should return an empty buffer for null-like inputs", () => {
      [null, undefined].forEach(input => {
        const result = new Data(input).toBuffer();
        assert.deepStrictEqual(result, Buffer.alloc(0));
      });
    });

    it("should truncate to a shorter byteLength", () => {
      const result = new Data(
        Buffer.from([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef])
      ).toBuffer(1);
      assert.deepStrictEqual(result, Buffer.from([0x01]));
    });

    it("should pad to a longer byteLength", () => {
      const result = new Data(Buffer.from([0x01])).toBuffer(10);
      const expected = Buffer.from([
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01
      ]);
      assert.deepStrictEqual(result, expected);
    });

    it("should prefer the specified byteLength, over the value provided to the constructor", () => {
      const byteLength = 10;
      const data = new Data("0x01", 2);

      const result = data.toBuffer(byteLength);
      const expected = Buffer.from([
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01
      ]);

      assert.deepStrictEqual(result, expected);
    });

    testData.forEach(([input, _, expected]) => {
      it(`should output the correct buffer for the input: 0x${(<Buffer>(
        input
      )).toString("hex")}`, () => {
        const result = new Data(<Buffer>input).toBuffer();
        assert.deepStrictEqual(result, expected);
      });
    });
  });

  describe("isNull()", () => {
    it("should return true for null-like inputs", () => {
      [null, undefined, Buffer.alloc(0)].forEach(input => {
        const data = new Data(input);
        assert(data.isNull());
      });
    });

    it("should return false for any non-empty buffer", () => {
      [Buffer.allocUnsafe(1), Buffer.allocUnsafe(2)].forEach(input => {
        const data = new Data(input);
        assert.strictEqual(data.isNull(), false);
      });
    });
  });
});
