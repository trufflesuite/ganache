import assert from "assert";
import {Address} from "../";

describe("@ganache/ethereum-address", () => {
  describe("toString()", () => {
    it("should pad an address to 20 bytes", () => {
      const address = new Address("0x1");
      const stringifiedAddress = address.toString();

      assert.equal(stringifiedAddress, "0x0000000000000000000000000000000000000001");
    });

    it("should truncate an address to the specified length", () => {
      const address = new Address("0x1");
      const stringifiedAddress = address.toString(1);

      assert.equal(stringifiedAddress, "0x01");
    });

    it("should stringify a 20 byte address string", () => {
      const address = new Address("0x2104859394604359378433865360947116707876");
      const stringifiedAddress = address.toString();

      assert.equal(stringifiedAddress, "0x2104859394604359378433865360947116707876");
    });
  });
});
