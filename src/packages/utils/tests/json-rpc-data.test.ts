import assert from "assert";
import {Data} from "../src/things/json-rpc/json-rpc-data";

// note: variations on non-buffer inputs are covered in the tests in ./input-parsers.test.ts

const testData = [
  //[input, toString(), toBuffer()]
  [Buffer.from([0x00]), "0x00", Buffer.from([0x00])],
  [Buffer.from([0x01]), "0x01", Buffer.from([0x01])],
  [Buffer.from([0x01,0x23,0x45,0x67,0x89,0xab,0xcd,0xef]), "0x0123456789abcdef", Buffer.from([0x01,0x23,0x45,0x67,0x89,0xab,0xcd,0xef])],
];

describe("json-rpc-data", () => {
  describe("constructor", () => {
    it("should create a Data", () => {
      const input = Buffer.alloc(0);        
      const data = new Data(input);

      assert(data instanceof Data);
    });
  });

  describe("from()", () => {
    it("should create a Data", () => {
      const input = Buffer.alloc(0);
      const data = Data.from(input);

      assert(data instanceof Data);
    });

    it("should return a Data passed as input", () => {
      const input = Data.from(Buffer.alloc(0));
      const data = Data.from(<any>input);

      assert.strictEqual(data, input);
    });
  });

  describe("toString()", () => {
    it("should return nullish inputs", () => {
      [null, undefined].forEach(input => {
        const result = new Data(input).toString();

        assert.strictEqual(result, input);
      });
    });

    testData.forEach(([input, expected]) => {
      it(`should stringify the input input: 0x${(<Buffer>input).toString("hex")}`, () => {
        const result = new Data(<Buffer>input).toString();
        assert.equal(result, expected);
      });
    });

    it("should truncate to a shorter byteLength", () => {
      const result = new Data(Buffer.from([0x01,0x23,0x45,0x67,0x89,0xab,0xcd,0xef])).toString(1);
      assert.equal(result, "0x01");
    });

    it("should pad to a longer byteLength", () => {
      const result = new Data(Buffer.from([0x01])).toString(10);
      assert.equal(result, "0x00000000000000000001");
    });
  });

  describe("toBuffer()", () => {
    it("should coalesce for empty buffer", () => {
      const result = new Data(Buffer.alloc(0)).toBuffer();
      assert.deepEqual(result, Buffer.alloc(0));
    });

    it("should coallesce nullish inputs", () => {
      [null, undefined].forEach(input => {
        const result = new Data(input).toBuffer();
        assert.deepEqual(result, Buffer.alloc(0));
      });
    });

    it("should truncate to a shorter byteLength", () => {
      const result = new Data(Buffer.from([0x01,0x23,0x45,0x67,0x89,0xab,0xcd,0xef])).toBuffer(1);
      assert.deepEqual(result, Buffer.from([0x01]));
    });

    it("should pad to a longer byteLength", () => {
      const result = new Data(Buffer.from([0x01])).toBuffer(10);
      const expected = Buffer.from([0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x01]);
      assert.deepEqual(result, expected);
    });

    testData.forEach(([input, _, expected]) => {
      it(`should output the correct buffer for the input: 0x${(<Buffer>input).toString("hex")}`, () => {
        const result = new Data(<Buffer>input).toBuffer();
        assert.deepEqual(result, expected);
      });
    });
  });
});
