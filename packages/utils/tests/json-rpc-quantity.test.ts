import assert from "assert";
import { Quantity } from "../src/things/json-rpc/json-rpc-quantity";

// note: variations on non-buffer inputs are covered in the tests in ./input-parsers.test.ts

const testData = [
  //[input, toString(), toNumber(), toBuffer()]
  [Buffer.from([0x00]), "0x0", 0, Buffer.alloc(0)],
  [Buffer.from([0x01]), "0x1", 1, Buffer.from([0x01])],
  [Buffer.from([0x00, 0x00, 0x00, 0x00, 0x01]), "0x1", 1, Buffer.from([0x01])],
  [
    Buffer.from([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]),
    "0x123456789abcdef",
    0x0123456789abcdef,
    Buffer.from([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef])
  ],
  [
    Buffer.from([0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    "0x10000000000000",
    0x10000000000000,
    Buffer.from([0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
  ]
];

const nullLikeInputs = [null, undefined, Buffer.alloc(0)];

describe("json-rpc-quantity", () => {
  describe("constructor", () => {
    it("should create a Quantity", () => {
      const input = Buffer.alloc(0);
      const quantity = new Quantity(input);
      const nullable = new Quantity(input, true);

      assert(quantity instanceof Quantity);
      assert(nullable instanceof Quantity);
    });

    it(`should reject a valid of "0x"`, () => {
      assert.throws(
        () => new Quantity("0x"),
        new Error(
          `Cannot wrap "0x" as a json-rpc Quantity type; strings must contain at least one hexadecimal character.`
        )
      );
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
    it("should return null for null-like inputs", () => {
      nullLikeInputs.forEach(input => {
        const result = new Quantity(input, true).toString();

        assert.strictEqual(result, null);
      });
    });

    it("should return 0x0 for a non-empty buffer of 0x00 bytes", () => {
      const result = new Quantity(Buffer.alloc(10), true).toString();

      assert.strictEqual(result, "0x0");
    });

    it(`should return "0x0" for null-like inputs`, () => {
      nullLikeInputs.forEach(input => {
        const result = new Quantity(input, false).toString();

        assert.strictEqual(result, "0x0");
      });
    });

    testData.forEach(([input, expected]) => {
      it(`should stringify the input: 0x${(<Buffer>input).toString(
        "hex"
      )}`, () => {
        [true, false].forEach(nullable => {
          const result = new Quantity(input, nullable).toString();

          assert.strictEqual(result, expected);
        });
      });
    });
  });

  describe("toNumber()", () => {
    it("should return null for `null | undefined` inputs", () => {
      nullLikeInputs.forEach(input => {
        const result = new Quantity(input, true).toNumber();

        assert.strictEqual(result, null);
      });
    });

    it("should return null for empty input", () => {
      const result = new Quantity(Buffer.alloc(0), true).toNumber();

      assert.strictEqual(result, null);
    });

    it("should return 0 for null-like inputs", () => {
      nullLikeInputs.forEach(input => {
        const result = new Quantity(input, false).toNumber();

        assert.strictEqual(result, 0);
      });
    });

    testData.forEach(([input, _, expected]) => {
      it(`should output the correct number for the input: 0x${(<Buffer>(
        input
      )).toString("hex")}`, () => {
        [true, false].forEach(nullable => {
          const result = new Quantity(input, nullable).toNumber();

          assert.strictEqual(result, expected);
        });
      });
    });
  });

  describe("toBuffer()", () => {
    // todo: as per https://github.com/trufflesuite/ganache/issues/3174
    // if value is null, and nullable is true, then it should probably return null
    it("should return null inputs", () => {
      nullLikeInputs.forEach(input => {
        const result = new Quantity(input, true).toBuffer();

        assert.deepStrictEqual(result, Buffer.alloc(0));
      });
    });

    it("should return an empty buffer for an empty buffer input", () => {
      const result = new Quantity(Buffer.alloc(0), true).toBuffer();

      assert.deepStrictEqual(result, Buffer.alloc(0));
    });

    it("should return an empty buffer for null-like inputs", () => {
      nullLikeInputs.forEach(input => {
        const result = new Quantity(input, false).toBuffer();

        assert.deepStrictEqual(result, Buffer.alloc(0));
      });
    });

    testData.forEach(([input, _, __, expected]) => {
      it(`should output the correct buffer for the input: 0x${(<Buffer>(
        input
      )).toString("hex")}`, () => {
        const result = new Quantity(input).toBuffer();

        assert.deepStrictEqual(result, expected);
      });
    });
  });

  describe("isNull()", () => {
    it("should return true for null-like inputs, regardless of nullable value", () => {
      [true, false].forEach(nullable => {
        nullLikeInputs.forEach(input => {
          const quantity = new Quantity(input, nullable);

          assert(quantity.isNull());
        });
      });
    });

    it("should return false for any non-empty buffer, regardless of nullable value", () => {
      [true, false].forEach(nullable => {
        [Buffer.alloc(1), Buffer.alloc(2)].forEach(input => {
          const quantity = new Quantity(input, nullable);

          assert.strictEqual(quantity.isNull(), false);
        });
      });
    });
  });
});
