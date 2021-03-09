import assert from "assert";
import * as RLP from "../";

describe("partial", function () {
  describe("RLP encoding:", function () {
    it("should return itself if single byte and less than 0x7f:", function () {
      const source = [Buffer.from("a")];
      const start = RLP.encodePartial(source, 0, 1);
      const encodedSelf = RLP.digest([start.output], start.length);
      assert(encodedSelf.equals(RLP.encode(source)));
    });

    it("length of string 0-55 should return (0x80+len(data)) plus data", function () {
      const source = [Buffer.from("dog")];
      const start = RLP.encodePartial(source, 0, 1);
      const encodedDog = RLP.digest([start.output], start.length);
      assert(encodedDog.equals(RLP.encode(source)));
    });

    it("length of string >55 should return 0xb7+len(len(data)) plus len(data) plus data", function () {
      const source = [
        Buffer.from(
          "zoo255zoo255zzzzzzzzzzzzssssssssssssssssssssssssssssssssssssssssssssss"
        )
      ];
      const start = RLP.encodePartial(source, 0, 1);
      const encodedLongString = RLP.digest([start.output], start.length);
      assert(encodedLongString.equals(RLP.encode(source)));
    });

    it("encodes `[null]`", function () {
      const source = [null];
      const start = RLP.encodePartial(source, 0, 1);
      const encodedNull = RLP.digest([start.output], start.length);
      assert(encodedNull.equals(RLP.encode(source)));
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
    ];

    it("encodes all nested parts", function () {
      const start = RLP.encodePartial(source as any, 0, source.length);
      const encodedNull = RLP.digest([start.output], start.length);
      assert(encodedNull.equals(RLP.encode(source)));
    });

    it("encodes range of nested parts", function () {
      const start = RLP.encodePartial(source as any, 2, 4);
      const encodedNull = RLP.digest([start.output], start.length);
      assert(encodedNull.equals(RLP.encode(source.slice(2, 4))));
    });

    it("digests multiple ranges", function () {
      const start = RLP.encodePartial(source as any, 1, 3);
      const end = RLP.encodePartial(source as any, 3, 5);
      const encodedNull = RLP.digest(
        [start.output, end.output],
        start.length + end.length
      );
      assert(encodedNull.equals(RLP.encode(source.slice(1))));
    });
  });
});
