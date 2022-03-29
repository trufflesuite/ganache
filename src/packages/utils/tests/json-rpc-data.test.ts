import assert from "assert";
import {Data} from "..";

describe("json-rpc-data", () => {
  const validValues = [ "0x", "0x1", "0x1234", Buffer.from([]), Buffer.from([0x12,0x34]) ];
  const invalidValues: any[] = [ "1234", 1234n, NaN/*, undefined, null, 1234, [], {}, "0x-1234"*/ ]; // todo: this should be addressed in rewrite of json-rpc-data
                                                                                                     // See related https://github.com/trufflesuite/ganache/issues/2728
  const validBytelengths = (() => { let i = 0; return [...new Array(100)].map(_ => i++); })(); // [0...99]
  const invalidBytelengths: any[] = [ -1, "1", {}, [], null, NaN ];
  const inputOf32Bytes = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

  function getExpectedString(value: Buffer|string, bytelength?: number) {
    let expected: string;

    if (typeof value === "string") {
      expected = value.slice(2);
    } else if (Buffer.isBuffer(value)) {
      expected = (<Buffer>value).toString("hex");
    } else {
      throw new Error(`Type not supported ${typeof value}`)
    }
    if (bytelength !== undefined) {
      const padCharCount = (bytelength - expected.length / 2) * 2; // (desired byte count - actual byte count) * 2 characters per byte
      if (padCharCount > 0) {
        expected = "0".repeat(padCharCount) + expected;
      } else {
        expected = expected.slice(Math.abs(padCharCount));
      }
    }
    return "0x" + expected;
  }

  describe("ctor", () => {
    it("should accept different values", () => {
      validValues.forEach(value => {
        const d = new Data(value);
      });
    });

    it("should fail with invalid values", () => {
      invalidValues.forEach(value => {
        assert.throws(() => {
          const d = new Data(value);
        }, undefined, `Should fail to accept value: ${value} of type: ${typeof value}`);
      });
    });

    it("should accept valid bytelengths", () => {
      validBytelengths.forEach(bytelength => {
        const d = new Data("0x01", bytelength);
      });
    });

    it("should fail with invalid bytelengths", () => {
      invalidBytelengths.forEach(bytelength => {
        assert.throws(() => {
          const d = new Data("0x01", bytelength);
        }, undefined, `Should fail to accept bytelength: ${bytelength} of type: ${typeof bytelength}`);
      });
    });
  });

  describe("from()", () => {
    it("should accept different representations of value", () => {
      validValues.forEach(value => {
        const d = Data.from(value);
      });
    });

    it("should fail with invalid values", () => {
      invalidValues.forEach(value => {
        assert.throws(() => {
          const d = Data.from(value);
        }, undefined, `Should fail to accept value: ${value} of type: ${typeof value}`);
      });
    });

    it("should accept valid bytelengths", () => {
      validBytelengths.forEach(bytelength => {
        const d = Data.from("0x01", bytelength);
      });
    });

    it("should fail with invalid bytelengths", () => {
      invalidBytelengths.forEach(bytelength => {
        assert.throws(() => {
          const d = Data.from("0x01", bytelength);
        }, undefined, `Should fail to accept bytelength: ${bytelength} of type: ${typeof bytelength}`);
      });
    });
  });

  describe("toString()", () => {
    it("should stringify without arguments", () => {
      validValues.forEach(value => {
        const d = new Data(value);
        const s = d.toString();
        const expected = getExpectedString(value);

        assert.equal(s, expected);
      });
    });

    it("should stringify with valid bytelengths", () => {
      validValues.forEach(value => {
        const d = new Data(value);
        validBytelengths.forEach(bytelength => {
          const s = d.toString(bytelength);
          const expected = getExpectedString(s, bytelength);

          assert.equal(s, expected);
        });
      });
    });

    it("should fail with invalid bytelengths", () => {
      validValues.forEach(value => {
        const d = new Data(value);
        invalidBytelengths.forEach(bytelength => {
          assert.throws(() => {
            const s = d.toString(<any>bytelength);
          }, undefined, `Should fail to accept bytelength: ${bytelength} of type: ${typeof bytelength}`);
        });
      });
    });

    it("should pad the value with larger bytelength", () => {
      validValues.forEach(value => {
        const d = new Data(value);
        const s = d.toString(10);
        const expected = getExpectedString(s, 10);

        assert.equal(s, expected);
      });
    });

    it("should truncate the value with a smaller bytelength", () => {
      const d = new Data("0x1234567890abcdef");
      const s = d.toString(2);

      assert.equal(s, "0x1234");
    });

    it("should truncate with a large value", () => {
      const expectedStringLength = 62; // 30 bytes x 2 characters per byte + 2 for 0x prefix
      const d = new Data(inputOf32Bytes);
      const s = d.toString(30);

      assert.equal(s, inputOf32Bytes.slice(0, expectedStringLength));
    });

    it("should pad with a large value", () => {
      const d = new Data(inputOf32Bytes);
      const s = d.toString(34); // 2 additional bytes, ie "0000"

      assert.equal(s, "0x0000" + inputOf32Bytes.slice(2));
    });
  });

  describe("toBuffer()", () => {
    it("should create a buffer", () => {
      const expected = Buffer.from([0x12, 0x34]);
      const d = new Data("0x1234");
      const b = d.toBuffer();

      assert.deepEqual(b, expected);
    });

    // todo: this should be addressed in rewrite of json-rpc-data
    it.skip("should create a buffer with a smaller bytelength", () => {
      const expected = Buffer.from([0x12, 0x34]);
      const d = new Data("0x123456789abcdef", 2);
      const b = d.toBuffer();

      assert.deepEqual(b, expected);
    });

    // todo: this should be addressed in rewrite of json-rpc-data
    it.skip("should create a buffer with a larger bytelength", () => {
      const expected = Buffer.from([0x00, 0x00, 0x12, 0x34]);
      const d = new Data("0x1234", 4);
      const b = d.toBuffer();

      assert.deepEqual(b, expected);
    });
  });
});
