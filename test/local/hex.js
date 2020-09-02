const assert = require("assert");
const to = require("../../lib/utils/to.js");

describe("to.rpcQuantityHexString", function() {
  it("should print '0x0' for input '0x'", function() {
    assert.strictEqual(to.rpcQuantityHexString("0x"), "0x0");
  });

  it("should print '0x0' for input 0", function() {
    assert.strictEqual(to.rpcQuantityHexString(0), "0x0");
  });

  it("should print '0x0' for input '0'", function() {
    assert.strictEqual(to.rpcQuantityHexString("0"), "0x0");
  });

  it("should print '0x0' for input '000'", function() {
    assert.strictEqual(to.rpcQuantityHexString("000"), "0x0");
  });

  it("should print '0x0' for input '0x000'", function() {
    assert.strictEqual(to.rpcQuantityHexString("0x000"), "0x0");
  });

  it("should print '0x20' for input '0x0020'", function() {
    assert.strictEqual(to.rpcQuantityHexString("0x0020"), "0x20");
  });
});

describe("to.rpcDataHexString", function() {
  it("should differentiate between a list of 0 items and a list of one 0", function() {
    assert.notStrictEqual(to.rpcDataHexString(Buffer.from("", "hex")), to.rpcDataHexString(Buffer.from("00", "hex")));
  });
});

describe("to.hex", function() {
  it("should print '0x' for input '' (blank)", function() {
    assert.strictEqual(to.hex(Buffer.from("")), "0x");
  });
});
