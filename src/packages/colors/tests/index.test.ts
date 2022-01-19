import assert from "assert";
import { TruffleColors } from "../src/";

describe("@ganache/colors", () => {
  it("contains rgba hex-encoded colors", () => {
    const rgbHexColorRegEx = /^#([a-f0-9]{3}){1,2}$/i;
    for (let name in TruffleColors) {
      const color = TruffleColors[name];
      assert.strictEqual(
        rgbHexColorRegEx.test(color),
        true,
        `Color "${color}" is not a valid rgb hex color.`
      );
    }
  });
});
