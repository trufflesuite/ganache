import assert from "assert";
import {Quantity} from "../src/things/json-rpc/json-rpc-quantity";

// note: variations on non-buffer inputs are covered in the tests in ./input-parsers.test.ts

const testData = [
  //[input, toString(), toNumber(), toBuffer()]
  [Buffer.alloc(0), "0x0", 0, Buffer.alloc(0)],
  [Buffer.from([0x00]), "0x0", 0, Buffer.alloc(0)],
  [Buffer.from([0x01]), "0x1", 1, Buffer.from([0x01])],
  [Buffer.from([0x00, 0x00, 0x00, 0x00, 0x01]), "0x1", 1, Buffer.from([0x01])],
  [Buffer.from([0x01,0x23,0x45,0x67,0x89,0xab,0xcd,0xef]), "0x123456789abcdef", 0x0123456789abcdef, Buffer.from([0x01,0x23,0x45,0x67,0x89,0xab,0xcd,0xef])],
];

describe("json-rpc-quantity", () => {
  describe("constructor", () => {
    it("should create a Quantity", () => {
      const input = Buffer.alloc(0);        
      const quantity = new Quantity(input);
      const nullable = new Quantity(input, true);

      assert(quantity instanceof Quantity);
      assert(nullable instanceof Quantity);
    });
  });

  describe("from()", () => {
    it("should create a Quantity", () => {
      const input = Buffer.alloc(0);
      const quantity = Quantity.from(input);
      const nullable = Quantity.from(input, true);

      assert(quantity instanceof Quantity);
      assert(nullable instanceof Quantity);
    });

    it("should return a Quantity passed as input", () => {
      const input = Quantity.from(Buffer.alloc(0));
      const quantity = Quantity.from(<any>input);

      assert.strictEqual(quantity, input);
    });
  });

  describe("toString()", () => {
    it("should return nullish inputs", () => {
      [null, undefined].forEach(input => {
        const result = new Quantity(input, true).toString();

        assert.strictEqual(result, input);
      });
    });

    it("should return null for empty buffer", () => {
      const result = new Quantity(Buffer.alloc(0), true).toString();
      assert.equal(result, null);
    });

    it("should coallesce nullish inputs", () => {
      [null, undefined].forEach(input => {
        const result = new Quantity(input, false).toString();

        assert.equal(result, "0x0");
      });
    });

    testData.forEach(([input, expected]) => {
      it(`should stringify the input input: 0x${(<Buffer>input).toString("hex")}`, () => {
        const result = new Quantity(input).toString();
        assert.equal(result, expected);
      });
    });
  });

  describe("toNumber()", () => {
    it("should return nullish inputs", () => {
      [null, undefined].forEach(input => {
        const result = new Quantity(input, true).toNumber();

        assert.strictEqual(result, input);
      });
    });

    // todo: should we return null for nullable quantities?
    it.skip("should return null for empty input", () => {
      const result = new Quantity(Buffer.alloc(0), true).toNumber();
      assert.equal(result, null);
    });

    it("should coallesce nullish inputs", () => {
      [null, undefined].forEach(input => {
        const result = new Quantity(input, false).toNumber();

        assert.equal(result, 0);
      });
    });

    testData.forEach(([input, _, expected]) => {
      it(`should output the correct number for the input input: 0x${(<Buffer>input).toString("hex")}`, () => {
        const result = new Quantity(input).toNumber();
        assert.equal(result, expected);
      });
    });
  });

  describe("toBuffer()", () => {
    // todo: should we return null for nullable quantities?
    it.skip("should return nullish inputs", () => {
      [null, undefined].forEach(input => {
        const result = new Quantity(input, true).toBuffer();

        assert.deepEqual(result, input);
      });
    });

    // todo: should we return null for nullable quantities?
    it("should coalesce for empty buffer", () => {
      const result = new Quantity(Buffer.alloc(0), true).toBuffer();
      assert.deepEqual(result, Buffer.alloc(0));
    });

    it("should coallesce nullish inputs", () => {
      [null, undefined].forEach(input => {
        const result = new Quantity(input, false).toBuffer();

        assert.deepEqual(result, Buffer.alloc(0));
      });
    });

    testData.forEach(([input, _, __, expected]) => {
      it(`should output the correct buffer for the input input: 0x${(<Buffer>input).toString("hex")}`, () => {
        const result = new Quantity(input).toBuffer();
        assert.deepEqual(result, expected);
      });
    });
  });
});
