import assert from "assert";
import { Quantity } from "../src/things/json-rpc/json-rpc-quantity";
import * as fc from "fast-check";

const MAX_BYTE_LENGTH = 32;

const arbitraryHexString = () => fc.hexaString({minLength: 1, maxLength: MAX_BYTE_LENGTH})
  .map(str => `0x${str}`);

const arbitraryBuffer = () => fc.uint8Array({minLength: 1, maxLength: MAX_BYTE_LENGTH})
  .map(uintArray => Buffer.from(uintArray));

const arbitraryQuantity = () => arbitraryBuffer()
  .map(buffer => Quantity.from(buffer));

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

      assert.equal(result, "0x0");
    });

    it(`should return "0x0" for null-like inputs`, () => {
      nullLikeInputs.forEach(input => {
        const result = new Quantity(input, false).toString();

        assert.equal(result, "0x0");
      });
    });

    testData.forEach(([input, expected]) => {
      it(`should stringify the input: 0x${(<Buffer>input).toString(
        "hex"
      )}`, () => {
        [true, false].forEach(nullable => {
          const result = new Quantity(input, nullable).toString();

          assert.equal(result, expected);
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

      assert.equal(result, null);
    });

    it("should return 0 for null-like inputs", () => {
      nullLikeInputs.forEach(input => {
        const result = new Quantity(input, false).toNumber();

        assert.equal(result, 0);
      });
    });

    testData.forEach(([input, _, expected]) => {
      it(`should output the correct number for the input: 0x${(<Buffer>(
        input
      )).toString("hex")}`, () => {
        [true, false].forEach(nullable => {
          const result = new Quantity(input, nullable).toNumber();

          assert.equal(result, expected);
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

        assert.deepEqual(result, Buffer.alloc(0));
      });
    });

    it("should return an empty buffer for an empty buffer input", () => {
      const result = new Quantity(Buffer.alloc(0), true).toBuffer();

      assert.deepEqual(result, Buffer.alloc(0));
    });

    it("should return an empty buffer for null-like inputs", () => {
      nullLikeInputs.forEach(input => {
        const result = new Quantity(input, false).toBuffer();

        assert.deepEqual(result, Buffer.alloc(0));
      });
    });

    testData.forEach(([input, _, __, expected]) => {
      it(`should output the correct buffer for the input: 0x${(<Buffer>(
        input
      )).toString("hex")}`, () => {
        const result = new Quantity(input).toBuffer();

        assert.deepEqual(result, expected);
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

          assert.equal(quantity.isNull(), false);
        });
      });
    });
  });

  const invalidMathFunctionArguments = [
    //-1,
    Infinity,
    -Infinity,
    NaN,
    0.1,
    //-1n,
    "-0x123",
    "0xg",
    "0.123",
    "-123",
    "0x0.1",
    "0x-1",
    "-0x1",
    "0x1234five",
    "0x1234-"
  ];

  const invalidMultiplierArguments = [
    ...invalidMathFunctionArguments,
    -1
  ];

  describe("add()", () => {
    it("should return the correct sum when adding a number", () => {
      fc.assert(fc.property(arbitraryQuantity(), fc.nat(), (quantity, addend) => {
        const sum = quantity.add(addend);

        const expected = (quantity.toBigInt() || 0n) + BigInt(addend);
        assert.equal(sum.toBigInt(), expected, `Incorrect sum adding ${addend} to ${quantity}. Expected ${expected}, got ${sum.toBigInt()}`);
      }));
    });

    it("should return the correct sum when adding a negative number", () => {
      fc.assert(fc.property(arbitraryQuantity(), fc.nat(), (expected, addend) => {
        const quantity = expected.add(addend);
        const sum = quantity.add(-addend);

        assert.equal(sum.toBigInt(), expected.toBigInt(), `Incorrect sum adding ${addend} to ${quantity}. Expected ${expected.toBigInt()}, got ${sum.toBigInt()}`);
      }));
    });

    it("should throw when adding a negative number, resulting in a negative sum", () => {
      fc.assert(fc.property(arbitraryQuantity().filter(q => (q.toNumber() || 0) < Number.MAX_SAFE_INTEGER), fc.nat().filter(n => n !== 0), (quantity, difference) => {        
        const subtrahend = (quantity.toNumber() || 0) + difference;

        const error = new Error(`Cannot add ${-subtrahend} to a a Quantity of ${quantity}, as it results in a negative value`);
        assert.throws(() => quantity.add(-subtrahend), error);
      }));
    });

    it("should return the correct sum when adding a negative BigInt", () => {
      fc.assert(fc.property(arbitraryQuantity(), fc.bigUint(), (expected, addend) => {
        const quantity = expected.add(addend);
        const sum = quantity.add(-addend);

        assert.equal(sum.toBigInt(), expected.toBigInt(), `Incorrect sum adding ${addend} to ${quantity}. Expected ${expected.toBigInt()}, got ${sum.toBigInt()}`);
      }));
    });

    it("should throw when adding a negative BigInt, resulting in a negative sum", () => {
      fc.assert(fc.property(arbitraryQuantity().filter(q => (q.toNumber() || 0) < Number.MAX_SAFE_INTEGER), fc.bigUint().filter(n => n !== 0n), (quantity, difference) => {        
        const subtrahend = (quantity.toBigInt() || 0n) + difference;

        const error = new Error(`Cannot add ${-subtrahend} to a a Quantity of ${quantity}, as it results in a negative value`);
        assert.throws(() => quantity.add(-subtrahend), error);
      }));
    });

    it("should return the correct sum when adding a bigint", () => {
      fc.assert(fc.property(arbitraryQuantity(), fc.bigUint(), (quantity, addend) => {
        const sum = quantity.add(addend);

        const expected = (quantity.toBigInt() || 0n) + addend;
        assert.equal(sum.toBigInt(), expected, `Incorrect sum adding ${addend} to ${quantity}. Expected ${expected}, got ${sum.toBigInt()}`);
      }));
    });

    it("should return the correct sum when adding a hex string", () => {
      fc.assert(fc.property(arbitraryQuantity(), arbitraryHexString(), (quantity, addend) => {
        const sum = quantity.add(addend);

        const expected = (quantity.toBigInt() || 0n) + Quantity.toBigInt(addend);
        assert.equal(sum.toBigInt(), expected, `Incorrect sum adding ${addend} to ${quantity}. Expected ${expected}, got ${sum.toBigInt()}`);
      }));
    });

    it("should return the correct sum when adding a buffer", () => {
      fc.assert(fc.property(arbitraryQuantity(), arbitraryBuffer(), (quantity, addend) => {
        const sum = quantity.add(addend);

        const expected = (quantity.toBigInt() || 0n) + Quantity.toBigInt(addend);
        assert.equal(sum.toBigInt(), expected, `Incorrect sum adding 0x${addend.toString("hex")} to ${quantity}. Expected ${expected}, got ${sum.toBigInt()}`);
      }));
    });

    it("should return the correct sum when adding a Quantity", () => {
      fc.assert(fc.property(arbitraryQuantity(), arbitraryQuantity(), (quantity, addend) => {
        const sum = quantity.add(addend);

        const expected = (quantity.toBigInt() || 0n) + (addend.toBigInt() || 0n);
        assert.equal(sum.toBigInt(), expected, `Incorrect sum adding ${addend} to ${quantity}. Expected ${expected}, got ${sum.toString()}`);
      }));
    });

    it(`should add a value to null`, () => {
      fc.assert(fc.property(fc.nat(), (addend) => {
        const result = Quantity.Null.add(addend);

        assert.equal(result.toNumber(), addend, `Incorrect sum adding ${addend} to a null Quantity. Expecting ${addend}, got ${result.toNumber()}.`);
      }));
    });

    it(`should add null`, () => {
      fc.assert(fc.property(arbitraryQuantity(), (quantity) => {
        const addend = null;
        const sum = quantity.add(addend);

        assert.equal(sum.toBigInt(), quantity.toBigInt(), `Incorrect sum adding null to a ${quantity}. Expecting ${quantity}, got ${sum.toBigInt()}.`);
      }));
    });

    it("should return a new Quantity instance", () => {
      const quantity = new Quantity(1);
      const sum = quantity.add(1);

      assert.notStrictEqual(quantity, sum);
    });

    it("should return a Quantity with the same nullable value", () => {
      [true,false].forEach(nullable => {
        const quantity = new Quantity(1, nullable);
        const sum = quantity.add(1);

        assert.equal(sum._nullable, nullable);
      });
    });

    invalidMathFunctionArguments.forEach(input => {
      const q = Quantity.from(1);
      it(`should reject invalid value: ${input}`, () => {
        assert.throws(() => q.add(input));
      });
    });
  });

  describe("multiply()", () => {
    it("should return the correct product when multiplying by a number", () => {
      fc.assert(fc.property(arbitraryQuantity(), fc.integer(), (quantity, multiplierValue) => {
        const multiplier = Math.abs(multiplierValue);
        const product = quantity.multiply(multiplier);

        const expected = (quantity.toBigInt() || 0n) * BigInt(multiplier);
        assert.equal(product.toBigInt(), expected, `Incorrect product multiplying ${quantity} by ${multiplier}. Expected ${expected}, got ${product.toBigInt()}`);
      }));
    });

    it("should return the correct product when multiplying by a bigint", () => {
      fc.assert(fc.property(arbitraryQuantity(), fc.bigUint(), (quantity, multiplier) => {
        const product = quantity.multiply(multiplier);

        const expected = (quantity.toBigInt() || 0n) * multiplier;
        assert.equal(product.toBigInt(), expected, `Incorrect product multiplying ${quantity} by ${multiplier}. Expected ${expected}, got ${product.toBigInt()}`);
      }));
    });

    it("should return the correct product when multiplying by a buffer", () => {
      fc.assert(fc.property(arbitraryQuantity(), arbitraryBuffer(), (quantity, multiplier) => {
        const product = quantity.multiply(multiplier);

        const expected = (quantity.toBigInt() || 0n) * Quantity.toBigInt(multiplier);
        assert.equal(product.toBigInt(), expected, `Incorrect product multiplying ${quantity} by 0x${multiplier.toString("hex")}. Expected ${expected}, got ${product.toBigInt()}`);
      }));
    });

    it("should return the correct product when multiplying by a Quantity", () => {
      fc.assert(fc.property(arbitraryQuantity(), arbitraryQuantity(), (quantity, multiplier) => {
        const product = quantity.multiply(multiplier);

        const expected = (quantity.toBigInt() || 0n) * (multiplier.toBigInt() || 0n);
        assert.equal(product.toBigInt(), expected, `Incorrect product multiplying ${quantity} by ${multiplier}. Expected ${expected}, got ${product.toBigInt()}`);
      }));
    });

    it("should return the correct product when multiplying by a hex string", () => {
      fc.assert(fc.property(arbitraryQuantity(), arbitraryHexString(), (quantity, multiplier) => {
        const product = quantity.multiply(multiplier);

        const expected = (quantity.toBigInt() || 0n) * Quantity.toBigInt(multiplier);
        assert.equal(product.toBigInt(), expected, `Incorrect product multiplying ${quantity} by ${multiplier}. Expected ${expected}, got ${product.toBigInt()}`);
      }));
    });

    it("should return a new Quantity instance", () => {
      const quantity = new Quantity(1);
      const product = quantity.multiply(1);

      assert.notStrictEqual(quantity, product);
    });

    it("should return a Quantity with the same nullable value", () => {
      [true,false].forEach(nullable => {
        const quantity = new Quantity(1, nullable);
        const product = quantity.multiply(1);

        assert.equal(product._nullable, nullable);
      });
    });

    invalidMultiplierArguments.forEach(input => {
      const q = Quantity.from(1);
      it(`should reject invalid value: ${input}`, () => {
        assert.throws(() => q.multiply(input));
      });
    });
  });
});
