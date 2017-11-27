var assert = require("assert");
var to = require("../lib/utils/to.js");

describe("to.hexWithoutLeadingZeroes", function() {
  it("should print '0x0' for input 0", function(done) {
    assert.equal(to.hexWithoutLeadingZeroes(0), "0x0");
    done();
  });

  it("should print '0x0' for input '0'", function(done) {
    assert.equal(to.hexWithoutLeadingZeroes("0"), "0x0");
    done();
  });

  it("should print '0x0' for input '000'", function(done) {
    assert.equal(to.hexWithoutLeadingZeroes("000"), "0x0");
    done();
  });

  it("should print '0x0' for input '0x000'", function(done) {
    assert.equal(to.hexWithoutLeadingZeroes("0x000"), "0x0");
    done();
  });

  it("should print '0x20' for input '0x0020'", function(done) {
    assert.equal(to.hexWithoutLeadingZeroes("0x0020"), "0x20");
    done();
  });
});
