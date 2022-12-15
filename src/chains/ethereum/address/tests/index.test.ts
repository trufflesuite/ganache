import assert from "assert";
import { Address } from "../";

describe("@ganache/ethereum-address", () => {
  describe("toString()", () => {
    it("should pad an address to 20 bytes", () => {
      const address = Address.from("0x1");
      const stringifiedAddress = address.toString();

      assert.strictEqual(
        stringifiedAddress,
        "0x0000000000000000000000000000000000000001"
      );
    });

    it("should truncate an address to 20 bytes", () => {
      const address = Address.from(
        "0x210485939460435937843386536094711670787612" // it's got an extra byte
      );
      const stringifiedAddress = address.toString();

      assert.strictEqual(
        stringifiedAddress,
        "0x2104859394604359378433865360947116707876"
      );
    });

    it("should stringify a 20 byte address string", () => {
      const address = Address.from(
        "0x2104859394604359378433865360947116707876"
      );
      const stringifiedAddress = address.toString();

      assert.strictEqual(
        stringifiedAddress,
        "0x2104859394604359378433865360947116707876"
      );
    });

    it("should pad an address to 20 bytes when called as static function", () => {
      const stringifiedAddress = Address.toString("0x1");

      assert.strictEqual(
        stringifiedAddress,
        "0x0000000000000000000000000000000000000001"
      );
    });
  });

  describe("toBuffer()", () => {
    it("should pad an address to 20 bytes", () => {
      const address = Address.from("0x1");
      const bufferAddress = address.toBuffer();
      const expected = Buffer.alloc(20);
      expected[19] = 1;

      assert.deepStrictEqual(bufferAddress, expected);
    });

    it("should truncate an address to 20 bytes", () => {
      const address = Address.from(
        "0x210485939460435937843386536094711670787612" // it's got an extra byte
      );
      const bufferAddress = address.toBuffer();
      const expected = Buffer.from([
        0x21, 0x04, 0x85, 0x93, 0x94, 0x60, 0x43, 0x59, 0x37, 0x84, 0x33, 0x86,
        0x53, 0x60, 0x94, 0x71, 0x16, 0x70, 0x78, 0x76
      ]);

      assert.deepStrictEqual(bufferAddress, expected);
    });
    it("should convert a 20 byte address to a buffer", () => {
      const address = Address.from(
        "0x2104859394604359378433865360947116707876"
      );
      const bufferAddress = address.toBuffer();
      const expected = Buffer.from([
        0x21, 0x04, 0x85, 0x93, 0x94, 0x60, 0x43, 0x59, 0x37, 0x84, 0x33, 0x86,
        0x53, 0x60, 0x94, 0x71, 0x16, 0x70, 0x78, 0x76
      ]);
      assert.deepStrictEqual(bufferAddress, expected);
    });

    it("should pad an address to 20 bytes when called as static function", () => {
      const bufferAddress = Address.toBuffer("0x1");
      const expected = Buffer.alloc(20);
      expected[19] = 1;

      assert.deepStrictEqual(bufferAddress, expected);
    });
  });

  describe("toJSON()", () => {
    it("should return the address as a string", () => {
      const address = Address.from("0x1");
      const stringifiedAddress = address.toJSON();

      assert.strictEqual(
        stringifiedAddress,
        "0x0000000000000000000000000000000000000001"
      );
    });
  });
});
