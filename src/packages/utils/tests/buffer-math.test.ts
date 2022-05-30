import {
  addNumberToBuffer,
  addBigIntToBuffer,
  getWorkingBufferSize,
  addUint8ArrayToBuffer
} from "../src/things/json-rpc/buffer-math";
import * as fc from "fast-check";
import assert from "assert";

function bigintToBuffer(int: bigint): Buffer {
  let bufferHex = int.toString(16);
  // bufferHex needs to be even length
  if (bufferHex.length & 1) bufferHex = "0" + bufferHex;
  return Buffer.from(bufferHex, "hex");
}

function bigintToUint8Array(int: bigint): Uint8Array {
  const buffer = bigintToBuffer(int);
  return new Uint8Array(buffer);
}

describe("buffer-math", () => {
  function numberToBuffer(int: number): Buffer {
    let bufferHex = int.toString(16);
    // bufferHex needs to be even length
    if (bufferHex.length & 1) bufferHex = "0" + bufferHex;
    return Buffer.from(bufferHex, "hex");
  }

  describe("addNumberToBuffer()", () => {
    it("should add 0 to a buffer", () => {
      fc.assert(fc.property(fc.integer(), (a) => {
        const bufferValue = Math.abs(a);
        const buffer = numberToBuffer(bufferValue)
        const sum = addNumberToBuffer(buffer, 0);

        assert.deepEqual(sum, buffer, `Incorrect sum, adding [0] to a buffer containing [0x${buffer.toString("hex")}]. Expected [0x${buffer.toString("hex")}], got [0x${sum.toString("hex")}]`);
      }));
    });

    it("should add 0 to an empty buffer", () => {
      const buffer = Buffer.alloc(0);
      const expected = Buffer.alloc(1);
      const sum = addNumberToBuffer(buffer, 0);

      assert.deepEqual(sum, expected);
    });

    it("should add an integer to an empty buffer", () => {
      const buffer = Buffer.allocUnsafe(0);
      fc.assert(fc.property(fc.integer(), (a) => {
        const addend = Math.abs(a);
        const expected = numberToBuffer(addend);
        const sum = addNumberToBuffer(buffer, addend);

        assert.deepEqual(sum, expected, `Incorrect sum, adding [${addend}] to an empty buffer. Expected [0x${expected.toString("hex")}], got [0x${sum.toString("hex")}]`);
      }));
    });

    it("should add an integer to a buffer containing 0", () => {
      const buffer = Buffer.allocUnsafe(1).fill(0);
      fc.assert(fc.property(fc.integer(), (a) => {
        const addend = Math.abs(a);
        const expected = numberToBuffer(addend);
        const sum = addNumberToBuffer(buffer, addend);

        assert.deepEqual(sum, expected, `Incorrect sum, adding [${addend}] to a buffer containing [0x00]. Expected [0x${expected.toString("hex")}], got [0x${sum.toString("hex")}]`);
      }));
    });

    it("should add an integer to a buffer pushing it over workingBuffer size", () => {
      const size = getWorkingBufferSize();
      const buffer = Buffer.allocUnsafe(size).fill(0xff);
      const addend = 1;
      const sum = addNumberToBuffer(buffer, addend);

      assert.equal(sum.length, size + 1);
      // it should now use the expanded workingBuffer
      assert(getWorkingBufferSize() > size);

      sum.forEach((byte, index) => {
        if (index === 0) {
          assert.equal(byte, 1);
        } else {
          assert.equal(byte, 0);
        }
      })
    });

    it("should add an integer to a buffer", () => {
      fc.assert(fc.property(fc.integer(), fc.integer(), (a, b) => {
        const bufferValue = Math.abs(b);
        const addend = Math.abs(a);
        const buffer = numberToBuffer(bufferValue);
        const expected = numberToBuffer(bufferValue + addend);
        const sum = addNumberToBuffer(buffer, addend);

        assert.deepEqual(sum, expected, `Incorrect sum, adding [${addend}] to a buffer containing [0x${buffer.toString("hex")}]. Expected [0x${expected.toString("hex")}], got [0x${sum.toString("hex")}]`);
      }));
    });
  });

  describe("addBigIntToBuffer()", () => {
    it("should add 0n to a buffer", () => {
      fc.assert(fc.property(fc.bigUint(), (bufferValue) => {
        const buffer = bigintToBuffer(bufferValue)
        const sum = addBigIntToBuffer(buffer, 0n);

        assert.deepEqual(sum, buffer, `Incorrect sum, adding [0n] to a buffer containing [0x${buffer.toString("hex")}]. Expected [0x${buffer.toString("hex")}], got [0x${sum.toString("hex")}]`);
      }));
    });

    it("should add bigint to an empty buffer", () => {
      const buffer = Buffer.allocUnsafe(0);
      fc.assert(fc.property(fc.bigUint(), (addend) => {
        const expected = bigintToBuffer(addend);
        const sum = addBigIntToBuffer(buffer, addend);

        assert.deepEqual(sum, expected, `Incorrect sum, adding [${addend}] to an empty buffer. Expected [0x${expected.toString("hex")}], got [0x${sum.toString("hex")}]`);
      }));
    });

    it("should add a bigint to a buffer containing 0", () => {
      const buffer = Buffer.allocUnsafe(1).fill(0);
      fc.assert(fc.property(fc.bigUint(), (addend) => {
        const expected = bigintToBuffer(addend);
        const sum = addBigIntToBuffer(buffer, addend);

        assert.deepEqual(sum, expected, `Incorrect sum, adding [${addend}] to a buffer containing [0x00]. Expected [0x${expected.toString("hex")}], got [0x${sum.toString("hex")}]`);
      }));
    });

    it("should add a bigint to a buffer pushing it over workingBuffer size", () => {
      const size = getWorkingBufferSize();
      const buffer = Buffer.allocUnsafe(size).fill(0xff);
      const addend = 1n;
      const sum = addBigIntToBuffer(buffer, addend);

      assert.equal(sum.length, size + 1);
      // it should now use the expanded workingBuffer
      assert(getWorkingBufferSize() > size);

      sum.forEach((byte, index) => {
        if (index === 0) {
          assert.equal(byte, 1);
        } else {
          assert.equal(byte, 0);
        }
      })
    });

    it("should add a bigint to a buffer", () => {
      fc.assert(fc.property(fc.bigUint(), fc.bigUint(), (addend, bufferValue) => {
        const buffer = bigintToBuffer(bufferValue);
        const expected = bigintToBuffer(bufferValue + addend);
        const sum = addBigIntToBuffer(buffer, addend);

        assert.deepEqual(sum, expected, `Incorrect sum, adding [${addend}] to a buffer containing [0x${buffer.toString("hex")}]. Expected [0x${expected.toString("hex")}], got [0x${sum.toString("hex")}]`);
      }));
    });
  });

  describe("addUint8ArrayToBuffer()", () => {
    it("should add an empty Uint8Array to a buffer", () => {
      const buffer = Buffer.alloc(0);
      const addend = new Uint8Array(0);
      const sum = addUint8ArrayToBuffer(buffer, addend);

      assert.equal(sum.length, 0);
    });

    it("should add a Uint8Array containing 0 to a buffer containing 0", () => {
      const buffer = Buffer.allocUnsafe(1).fill(0);
      const addend = new Uint8Array(1);
      const sum = addUint8ArrayToBuffer(buffer, addend);

      assert.equal(sum.length, 1);
      assert.equal(sum[0], 0);
    });

    it("should add an empty Uint8Array to a non-empty buffer", () => {
      fc.assert(fc.property(fc.bigUint(), (bufferValue) => {
        const buffer = bigintToBuffer(bufferValue);
        const addend = new Uint8Array(0);
        const sum = addUint8ArrayToBuffer(buffer, addend);

        assert.deepEqual(sum, buffer, `Incorrect sum, adding an empty Uint8Array to a buffer containing [0x${buffer.toString("hex")}]. Expected [0x${buffer.toString("hex")}], got [0x${sum.toString("hex")}]`);
      }));
    });

    it("should add a non-empty Uint8Array to a empty buffer", () => {
      fc.assert(fc.property(fc.bigUint(), (bufferValue) => {
        const buffer = Buffer.alloc(0);
        const addend = bigintToUint8Array(bufferValue);
        const sum = addUint8ArrayToBuffer(buffer, addend);

        assert.deepEqual(sum, addend, `Incorrect sum, adding an empty Uint8Array to a buffer containing [0x${buffer.toString("hex")}]. Expected [${addend}], got [0x${sum.toString("hex")}]`);
      }));
    });

    it("should add a Uint8Array containing 0 to a non-empty buffer", () => {
      fc.assert(fc.property(fc.bigUint(), (bufferValue) => {
        const buffer = bigintToBuffer(bufferValue);
        const addend = new Uint8Array(1);
        const sum = addUint8ArrayToBuffer(buffer, addend);

        assert.deepEqual(sum, buffer, `Incorrect sum, adding a Uint8Array containing [0] to a buffer containing [0x${buffer.toString("hex")}]. Expected [0x${buffer.toString("hex")}], got [0x${sum.toString("hex")}]`);
      }));
    });

    it("should add a Uint8Array to a buffer pushing it over workingBuffer size", () => {
      const size = getWorkingBufferSize();
      const buffer = Buffer.allocUnsafe(size).fill(0xff);
      const addend = new Uint8Array([0x1]);
      const sum = addUint8ArrayToBuffer(buffer, addend);

      assert.equal(sum.length, size + 1);
      // it should now use the expanded workingBuffer
      assert(getWorkingBufferSize() > size);

      sum.forEach((byte, index) => {
        if (index === 0) {
          assert.equal(byte, 1);
        } else {
          assert.equal(byte, 0);
        }
      });
    });

    it("should add a Uint8Array to a buffer", () => {
      fc.assert(fc.property(fc.bigUint(), fc.bigUint(), (bufferValue, addendValue) => {
        const buffer = bigintToBuffer(bufferValue);
        const addend = bigintToUint8Array(addendValue);
        const expected = bigintToBuffer(bufferValue + addendValue);
        const sum = addUint8ArrayToBuffer(buffer, addend);

        assert.deepEqual(sum, expected, `Incorrect sum, adding a [${addend}] to a buffer containing [0x${buffer.toString("hex")}]. Expected [0x${expected.toString("hex")}], got [0x${sum.toString("hex")}]`);
      }));
    });
  });
});
