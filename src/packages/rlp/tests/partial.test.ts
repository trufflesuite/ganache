import assert from "assert";
import * as RLP from "../";

describe("partial", function () {
  describe("RLP encoding:", function () {
    it("should return itself if single byte and less than 0x7f:", function () {
      const source = [Buffer.from("a")] as const;
      const start = RLP.encodeRange(source, 0, 1);
      const encodedSelf = RLP.digest([start.output], start.length);
      assert(encodedSelf.equals(RLP.encode(source)));
    });

    it("length of string 0-55 should return (0x80+len(data)) plus data", function () {
      const source = [Buffer.from("dog")] as const;
      const start = RLP.encodeRange(source, 0, 1);
      const encodedDog = RLP.digest([start.output], start.length);
      assert(encodedDog.equals(RLP.encode(source)));
    });

    it("length of string >55 should return 0xb7+len(len(data)) plus len(data) plus data", function () {
      const source = [
        Buffer.from(
          "zoo255zoo255zzzzzzzzzzzzssssssssssssssssssssssssssssssssssssssssssssss"
        )
      ] as const;
      const start = RLP.encodeRange(source, 0, 1);
      const encodedLongString = RLP.digest([start.output], start.length);
      assert(encodedLongString.equals(RLP.encode(source)));
    });

    it("encodes `[null]`", function () {
      const source = [null] as const;
      const start = RLP.encodeRange(source, 0, 1);
      const encodedNull = RLP.digest([start.output], start.length);
      assert(encodedNull.equals(RLP.encode(source)));
    });

    it("should use a provided `offset` value and `alloc` function", function () {
      const source = [Buffer.from("dog")] as const;
      const start = RLP.encodeRange(source, 0, 1);
      const expected = Buffer.from([1, 2, 3]);
      const offset = expected.length;
      function alloc(size: number) {
        const buf = Buffer.allocUnsafe(size + offset);
        buf[0] = expected[0];
        buf[1] = expected[1];
        buf[2] = expected[2];
        return buf;
      }
      const encoded = RLP.digest([start.output], start.length, offset, alloc);
      assert(encoded.subarray(0, offset).equals(expected));
      assert(encoded.subarray(offset).equals(RLP.encode(source)));
    });
  });
  describe("nested", () => {
    const source = [
      [
        Buffer.from([1, 2, 3]),
        Buffer.from([4, 5, 6]),
        [Buffer.from([4, 5, 6])]
      ],
      Buffer.from([4, 5, 6]),
      null,
      Buffer.from([0]),
      [[[Buffer.from([254])]]]
    ] as const;

    it("encodes all nested parts", function () {
      const start = RLP.encodeRange(source, 0, source.length);
      const encodedNull = RLP.digest([start.output], start.length);
      assert(encodedNull.equals(RLP.encode(source)));
    });

    it("encodes range of nested parts", function () {
      const start = RLP.encodeRange(source, 2, 2);
      const encodedNull = RLP.digest([start.output], start.length);
      assert(encodedNull.equals(RLP.encode(source.slice(2, 4))));
    });

    it("digests multiple ranges", function () {
      const start = RLP.encodeRange(source, 1, 2);
      const end = RLP.encodeRange(source, 3, 2);
      const encodedNull = RLP.digest(
        [start.output, end.output],
        start.length + end.length
      );
      assert(encodedNull.equals(RLP.encode(source.slice(1))));
    });
  });
});
