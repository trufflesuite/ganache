import assert from "assert";
import * as RLP from "../";

/** Check if a string is prefixed by 0x */
function isHexPrefixed(str: string): boolean {
  return str.slice(0, 2) === "0x";
}

/** Removes 0x from a given String */
function stripHexPrefix(str: string): string {
  if (typeof str !== "string") {
    return str;
  }
  return isHexPrefixed(str) ? str.slice(2) : str;
}

/** Transform an integer into its hexadecimal value */
function intToHex(integer: number | bigint): string {
  if (integer < 0) {
    throw new Error("Invalid integer as argument, must be unsigned!");
  }
  const hex = integer.toString(16);
  return hex.length % 2 ? `0${hex}` : hex;
}

/** Pad a string to be even */
function padToEven(a: string): string {
  return a.length % 2 ? `0${a}` : a;
}

/** Transform an integer into a Buffer */
function intToBuffer(integer: number | bigint): Buffer {
  const hex = intToHex(integer);
  return Buffer.from(hex, "hex");
}

function toBuffer(v: any): Buffer {
  if (!Buffer.isBuffer(v)) {
    if (typeof v === "string") {
      if (isHexPrefixed(v)) {
        return Buffer.from(padToEven(stripHexPrefix(v)), "hex");
      } else {
        return Buffer.from(v);
      }
    } else if (typeof v === "number" || typeof v === "bigint") {
      if (!v) {
        return Buffer.from([]);
      } else {
        return intToBuffer(v);
      }
    } else if (v === null || v === undefined) {
      return Buffer.from([]);
    } else if (v instanceof Uint8Array) {
      return Buffer.from(v as any);
    } else {
      throw new Error("invalid type");
    }
  }
  return v;
}

describe("offical tests", function () {
  const officalTests = require("./fixture/rlptest.json").tests;

  for (const testName in officalTests) {
    it(`should pass ${testName}`, function (done) {
      let incoming = officalTests[testName].in;
      // if we are testing a big number
      if (incoming[0] === "#") {
        const bn = BigInt(incoming.slice(1));
        incoming = Buffer.from(toBuffer(bn));
      }

      function fix(incoming: any) {
        if (Array.isArray(incoming)) {
          incoming.forEach((item, i) => {
            incoming[i] = fix(item);
          });
          return incoming;
        } else {
          return toBuffer(incoming);
        }
      }
      const fixed = fix(incoming);

      const encoded = RLP.encode(fixed);
      assert.strictEqual(
        "0x" + encoded.toString("hex"),
        officalTests[testName].out.toLowerCase()
      );
      done();
    });
  }
});
