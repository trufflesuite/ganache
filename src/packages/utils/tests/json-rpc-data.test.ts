import assert from "assert";
import {Data} from "..";

describe("json-rpc-data", () => {
    it("should stringify without specifying byteLength", () => {
      const cases = [
        {input: "0x1", expected: "0x1"}, // I'm not sure whether this is the correct behaviour - should it return a single byte length string - ie 0x01?
        {input: "0x01", expected: "0x01"},
        {input: "0x0123456789abcdef", expected: "0x0123456789abcdef"},
        {input: Buffer.from([0x01]), expected: "0x01"}
      ];

      cases.forEach(c => {
        const d = new Data(c.input);
        const stringified = d.toString();

        assert.equal(stringified, c.expected);
      });
    });

    it("should stringify to fixed byteLength", () => {
      const cases = [
        {input: "0x1", length: 1,  expected: "0x01"},
        {input: "0x01", length: 2, expected: "0x0001"},
        {input: "0x01", length: 10, expected: "0x00000000000000000001"},
        {input: Buffer.from([0x01]), length: 2, expected: "0x0001"}
      ];

      cases.forEach(c => {
        const d = new Data(c.input);
        const stringified = d.toString(c.length);

        assert.equal(stringified, c.expected);
      });
    });

    it("should stringify and truncate to a shorter byteLength", () => {
      const cases = [
        {input: "0x0123", length: 1,  expected: "0x01"},
        {input: "0x0123456789abcdef", length: 2, expected: "0x0123"},
        {input: Buffer.from([0x01, 0x23]), length: 1, expected: "0x01"}
      ];

      cases.forEach(c => {
        const d = new Data(c.input);
        const stringified = d.toString(c.length);

        assert.equal(stringified, c.expected);
      });
    });

    it("should stringify to the byteLength specified in the constructor", () => {
      const cases = [
        {input: "0x01", constructorLength: 1,  expected: "0x01"},
        {input: "0x01", constructorLength: 10, expected: "0x00000000000000000001"},
        {input: "0x0123456789abcdef", constructorLength: 2, expected: "0x0123"},
        {input: "0x0123456789abcdef", constructorLength: 8, expected: "0x0123456789abcdef"},
        {input: Buffer.from([0x01, 0x23]), constructorLength: 1, expected: "0x01"},
        {input: Buffer.from([0x01]), constructorLength: 2, expected: "0x0001"}
      ];

      cases.forEach(c => {
        const d = new Data(c.input, c.constructorLength);
        const stringified = d.toString();

        assert.equal(stringified, c.expected, `Expected "${stringified}" to be "${c.expected}", for input "${c.input}" and constructorLength ${c.constructorLength}`);
      });
    });

    it("should stringify to the byteLength specified in toString, over the byteLength specified in the constructor", () => {
      const cases = [
        {input: "0x01", constructorLength: 2, length: 1,  expected: "0x01"},
        {input: "0x01", constructorLength: 1, length: 10, expected: "0x00000000000000000001"},
        {input: "0x0123456789abcdef", constructorLength: 1, length: 2, expected: "0x0123"},
        {input: Buffer.from([0x01, 0x23]), constructorLength: 2, length: 1, expected: "0x01"},
        {input: Buffer.from([0x01]), constructorLength: 1, length: 2, expected: "0x0001"}
      ];

      cases.forEach(c => {
        const d = new Data(c.input, c.constructorLength);
        const stringified = d.toString(c.length);

        assert.equal(stringified, c.expected);
      });
    });

    it("should stringify an empty value", () => {
      const d = new Data("0x", 0);
      const stringified = d.toString(0);

      assert.equal(stringified, "0x");
    });

    it("should fail with invalid byte lengths", () => {
      const invalidByteLengths = [ -1, "1", {}, [], null, NaN ]; // undefined is a valid value

      invalidByteLengths.forEach(byteLength => {
        const d = new Data("0x01");
        assert.throws(() => d.toString(<any>byteLength), { message: `byteLength must be a number greater than or equal to 0, provided: ${byteLength}` }, `Invalid byteLength provided to toString: <${typeof byteLength}>: ${byteLength}`);
      });

      invalidByteLengths.forEach(byteLength => {
        assert.throws(() => new Data("0x01", <any>byteLength), { message: `byteLength must be a number greater than or equal to 0, provided: ${byteLength}` }, `Invalid byteLength provided to ctor: <${typeof byteLength}>: ${byteLength}`);
      });
    });
  });
});
