import assert from "assert";
import {
  BlockTime,
  IncrementBasedBlockTime
} from "../src/block-time";

const pastTimestamp = +new Date("2010-01-27T16:42:33.875Z");
const midTimestamp = +new Date("2021-06-04T16:42:33.875Z");
const futureTimestamp = +new Date("2022-04-06T16:42:33.875Z");
const duration = 843248;

describe.only("block-time", () => {
  describe("ClockBasedBlockTime", () => {
    type TickingReferenceClock = {
      (): number;
      tick: (duration: number) => void;
    };

    // create a reference clock that returns a constant internal representation of time. The internal time
    // can be incremented by any arbitrary number of milliseconds by calling `referenceClock.tick(duration);`
    function createTickingReferenceClock(
      initialTimestampMilliseconds: number
    ): TickingReferenceClock {
      const clock = () => initialTimestampMilliseconds;
      clock.tick = tickMilliseconds =>
        (initialTimestampMilliseconds += tickMilliseconds);

      return clock;
    }

    describe("constructor", () => {
      it("should throw with negative timestamp", () => {
        assert.throws(
          () => new BlockTime(() => 0, -100),
          new Error(`Invalid block timestamp: -100. Timestamp must be positive.`)
        );
      });
    });

    describe("getOffset()", () => {
      it("should get a positive offset", () => {
        const referenceTimestamp = midTimestamp;
        const blockTime = new BlockTime(
          () => referenceTimestamp,
          futureTimestamp
        );
        const offset = blockTime.getOffset();

        assert(offset > 0, "Unexpected offset - offset should be positive");
        assert.strictEqual(
          offset,
          futureTimestamp - referenceTimestamp,
          "Unexpected offset"
        );
      });

      it("should get a negative offset", () => {
        const referenceTimestamp = midTimestamp;
        const blockTime = new BlockTime(
          () => referenceTimestamp,
          pastTimestamp
        );
        const offset = blockTime.getOffset();

        assert(offset < 0, "Unexpected offset - offset should be negative");
        assert.strictEqual(
          offset,
          pastTimestamp - referenceTimestamp,
          "Unexpected offset"
        );
      });

      it("should get a neutral offset", () => {
        const referenceTimestamp = midTimestamp;
        const blockTime = new BlockTime(
          () => referenceTimestamp,
          referenceTimestamp
        );
        const offset = blockTime.getOffset();

        assert.strictEqual(offset, 0, "Unexpected offset");
      });

      it("should get a neutral offset when no startTime is provided", () => {
        const referenceTimestamp = midTimestamp;
        const blockTime = new BlockTime(
          () => referenceTimestamp,
          undefined
        );
        const offset = blockTime.getOffset();

        assert.strictEqual(offset, 0, "Unexpected offset");
      });
    });

    describe("setOffset()", () => {
      it("should set a positive offset", () => {
        const referenceTimestamp = midTimestamp;
        const blockTime = new BlockTime(
          () => referenceTimestamp,
          undefined
        );
        blockTime.setOffset(duration);
        const offset = blockTime.getOffset();

        assert.strictEqual(offset, duration, "Unexpected offset");
      });

      it("should set a negative offset", () => {
        const referenceTimestamp = midTimestamp;
        const blockTime = new BlockTime(
          () => referenceTimestamp,
          undefined
        );
        blockTime.setOffset(-duration);
        const offset = blockTime.getOffset();

        assert.strictEqual(offset, -duration, "Unexpected offset");
      });

      it("should set a netural offset", () => {
        const referenceTimestamp = midTimestamp;
        const blockTime = new BlockTime(
          () => referenceTimestamp,
          pastTimestamp
        );
        blockTime.setOffset(0);
        const offset = blockTime.getOffset();

        assert.strictEqual(offset, 0, "Unexpected offset");
      });

      it("should throw when resulting timestamp is negative", () => {
        const referenceTimestamp = midTimestamp;
        const blockTime = new BlockTime(
          () => referenceTimestamp,
          undefined
        );

        assert.throws(() => blockTime.setOffset(-referenceTimestamp - 1));
      });
    });

    describe("setTime", () => {
      it("should return a positive offset when setting a time in the future", () => {
        const referenceTimestamp = midTimestamp;
        const blockTime = new BlockTime(
          () => referenceTimestamp,
          undefined
        );
        const offset = blockTime.setTime(futureTimestamp);

        assert.strictEqual(
          offset,
          futureTimestamp - referenceTimestamp,
          "Unexpected offset"
        );
      });

      it("should return a negative offset when setting a time in the past", () => {
        const referenceTimestamp = midTimestamp;
        const blockTime = new BlockTime(
          () => referenceTimestamp,
          undefined
        );
        const offset = blockTime.setTime(pastTimestamp);

        assert.strictEqual(
          offset,
          pastTimestamp - referenceTimestamp,
          "Unexpected offset"
        );
      });

      it("should throw with negative timestamp", () => {
        const blockTime = new BlockTime(
          () => midTimestamp,
          midTimestamp
        );

        assert.throws(
          () => blockTime.setTime(-100),
          new Error(`Invalid block timestamp: -100. Timestamp must be positive.`)
        );
      });
    });

    describe("createBlockTimestamp()", () => {
      it("should create a sequence of incrementing blockTimestamps", () => {
        const startTime = midTimestamp;
        const clock = createTickingReferenceClock(startTime);
        const blockTime = new BlockTime(clock, undefined);

        for (let i = 0; i < 10; i++) {
          const expectedTimestampSeconds = Math.floor(clock() / 1000);

          const blockTimestamp = blockTime.createBlockTimestampInSeconds();
          assert.strictEqual(blockTimestamp, expectedTimestampSeconds);

          // tick the clock a random duration up to 2 minutes
          clock.tick(Math.floor(Math.random() * 120000));
        }
      });

      it("should create a sequence of incrementing blockTimestamps with a positive offset", () => {
        const startTime = midTimestamp;
        const clock = createTickingReferenceClock(startTime);
        const blockTime = new BlockTime(clock, undefined);
        blockTime.setOffset(duration);

        for (let i = 0; i < 10; i++) {
          const expectedTimestampSeconds = Math.floor(
            (clock() + duration) / 1000
          );

          const blockTimestamp = blockTime.createBlockTimestampInSeconds();
          assert.strictEqual(blockTimestamp, expectedTimestampSeconds);

          // tick the clock a random duration up to 2 minutes
          clock.tick(Math.floor(Math.random() * 120000));
        }
      });

      it("should create a sequence of incrementing blockTimestamps with a negative offset", () => {
        const startTime = midTimestamp;
        const clock = createTickingReferenceClock(startTime);
        const blockTime = new BlockTime(clock, undefined);
        blockTime.setOffset(-duration);

        for (let i = 0; i < 10; i++) {
          const expectedTimestampSeconds = Math.floor(
            (clock() - duration) / 1000
          );

          const blockTimestamp = blockTime.createBlockTimestampInSeconds();
          assert.strictEqual(blockTimestamp, expectedTimestampSeconds);

          // tick the clock a random duration up to 2 minutes
          clock.tick(Math.floor(Math.random() * 120000));
        }
      });
    });

    describe("createBlockTimestamp(timestamp)", () => {
      it("should create a blockTimestamp equal to the specified timestamp with a positive offset", () => {
        const referenceTimestamp = midTimestamp;
        const blockTime = new BlockTime(
          () => referenceTimestamp,
          undefined
        );

        const blockTimestamp =
          blockTime.createBlockTimestampInSeconds(futureTimestamp);
        const offset = blockTime.getOffset();

        assert(offset > 0);
        assert.strictEqual(
          blockTimestamp,
          Math.floor(futureTimestamp / 1000),
          "Unexpected blockTimestamp"
        );
        assert.strictEqual(
          offset,
          futureTimestamp - referenceTimestamp,
          "Unexpected offset"
        );
      });

      it("should create a blockTimestamp equal to the specified timestamp with a negative offset", () => {
        const referenceTimestamp = midTimestamp;
        const blockTime = new BlockTime(
          () => referenceTimestamp,
          undefined
        );

        const blockTimestamp =
          blockTime.createBlockTimestampInSeconds(pastTimestamp);
        const offset = blockTime.getOffset();

        assert(offset < 0);
        assert.strictEqual(
          blockTimestamp,
          Math.floor(pastTimestamp / 1000),
          "Unexpected blockTimestamp"
        );
        assert.strictEqual(
          offset,
          pastTimestamp - referenceTimestamp,
          "Unexpected offset"
        );
      });
    });
  });

  describe("IncrementBasedBlockTime", () => {
    const increment = 1000;

    describe("constructor", () => {
      it("should throw with negative timestamp", () => {
        assert.throws(
          () => new IncrementBasedBlockTime(-100, increment),
          new Error(`Invalid block timestamp: -100. Timestamp must be positive.`)
        );
      });
    });

    describe("getOffset()", () => {
      it("should always have an initial offset of zero", () => {
        [midTimestamp, 0].forEach(startTime => {
          const blockTime = new IncrementBasedBlockTime(startTime, increment);
          assert.strictEqual(blockTime.getOffset(), 0);
        });
      });
    });

    describe("setOffset()", () => {
      it("should set a positive offset", () => {
        const startTime = midTimestamp;
        const blockTime = new IncrementBasedBlockTime(startTime, increment);
        blockTime.setOffset(duration);
        const offset = blockTime.getOffset();
        assert.strictEqual(offset, duration, "Unexpected offset");
      });

      it("should set a negative offset", () => {
        const startTime = midTimestamp;
        const blockTime = new IncrementBasedBlockTime(startTime, increment);
        blockTime.setOffset(-duration);
        const offset = blockTime.getOffset();

        assert.strictEqual(offset, -duration, "Unexpected offset");
      });

      it("should set a netural offset", () => {
        const blockTime = new IncrementBasedBlockTime(pastTimestamp, increment);
        blockTime.setOffset(0);
        const offset = blockTime.getOffset();

        assert.strictEqual(offset, 0, "Unexpected offset");
      });

      it("should throw when resulting timestamp is negative", () => {
        const startTime = midTimestamp;
        const blockTime = new IncrementBasedBlockTime(startTime, increment);

        assert.throws(() => blockTime.setOffset(-startTime - 1));
      });
    });

    describe("setTime", () => {
      it("should return a positive offset when setting a time in the future", () => {
        const startTime = midTimestamp;
        const blockTime = new IncrementBasedBlockTime(startTime, increment);
        const offset = blockTime.setTime(futureTimestamp);

        assert.strictEqual(
          offset,
          futureTimestamp - startTime,
          "Unexpected offset"
        );
      });

      it("should return a negative offset when setting a time in the past", () => {
        const startTime = midTimestamp;
        const blockTime = new IncrementBasedBlockTime(startTime, increment);

        const offset = blockTime.setTime(pastTimestamp);

        assert.strictEqual(
          offset,
          pastTimestamp - startTime,
          "Unexpected offset"
        );
      });

      it("should throw with negative timestamp", () => {
        const blockTime = new IncrementBasedBlockTime(midTimestamp, increment);

        assert.throws(
          () => blockTime.setTime(-100),
          new Error(`Invalid block timestamp: -100. Timestamp must be positive.`)
        );
      });
    });

    describe("createBlockTimestamp()", () => {
      it("should create a sequence of incrementing blockTimestamps", () => {
        const startTime = midTimestamp;
        const blockTime = new IncrementBasedBlockTime(startTime, increment);

        for (let i = 0; i < 10; i++) {
          const expectedOffset = i * increment;

          // increment happens _after_ creating the block timestamp
          const expectedTimestampSeconds = Math.floor(
            (startTime + expectedOffset) / 1000
          );

          const blockTimestamp = blockTime.createBlockTimestampInSeconds();
          assert.strictEqual(blockTimestamp, expectedTimestampSeconds);

          const offset = blockTime.getOffset();
          // calling createBlockTimestampInSeconds() causes the offset to be increased by the value of increment
          assert.strictEqual(offset, expectedOffset + increment);
        }
      });

      it("should create a sequence of incrementing blockTimestamps with a positive offset", () => {
        const startTime = midTimestamp;
        const blockTime = new IncrementBasedBlockTime(startTime, increment);
        blockTime.setOffset(duration);

        for (let i = 0; i < 10; i++) {
          const expectedOffset = i * increment + duration;

          // increment happens _after_ creating the block timestamp
          const expectedTimestampSeconds = Math.floor(
            (startTime + expectedOffset) / 1000
          );

          const blockTimestamp = blockTime.createBlockTimestampInSeconds();
          assert.strictEqual(blockTimestamp, expectedTimestampSeconds);

          const offset = blockTime.getOffset();
          // calling createBlockTimestampInSeconds() causes the offset to be increased by the value of increment
          assert.strictEqual(offset, expectedOffset + increment);
        }
      });

      it("should create a sequence of incrementing blockTimestamps with a negative offset", () => {
        const startTime = midTimestamp;
        const blockTime = new IncrementBasedBlockTime(startTime, increment);
        blockTime.setOffset(-duration);

        for (let i = 0; i < 10; i++) {
          const expectedOffset = i * increment - duration;

          // increment happens _after_ creating the block timestamp
          const expectedTimestampSeconds = Math.floor(
            (startTime + expectedOffset) / 1000
          );

          const blockTimestamp = blockTime.createBlockTimestampInSeconds();
          assert.strictEqual(blockTimestamp, expectedTimestampSeconds);

          const offset = blockTime.getOffset();
          // calling createBlockTimestampInSeconds() causes the offset to be increased by the value of increment
          assert.strictEqual(offset, expectedOffset + increment);
        }
      });
    });

    describe("createBlockTimestamp(timestamp)", () => {
      it("should create a blockTimestamp equal to the specified timestamp with a positive offset", () => {
        const startTime = midTimestamp;
        const blockTime = new IncrementBasedBlockTime(startTime, increment);

        const blockTimestamp =
          blockTime.createBlockTimestampInSeconds(futureTimestamp);
        const offset = blockTime.getOffset();

        assert.strictEqual(
          blockTimestamp,
          Math.floor(futureTimestamp / 1000),
          "Unexpected blockTimestamp"
        );

        assert.strictEqual(
          offset,
          futureTimestamp - startTime + increment,
          "Unexpected offset"
        );
      });

      it("should create a blockTimestamp equal to the specified timestamp with a negative offset", () => {
        const startTime = midTimestamp;
        const blockTime = new IncrementBasedBlockTime(startTime, increment);

        const blockTimestamp =
          blockTime.createBlockTimestampInSeconds(pastTimestamp);
        const offset = blockTime.getOffset();

        assert(offset < 0);
        assert.strictEqual(
          blockTimestamp,
          Math.floor(pastTimestamp / 1000),
          "Unexpected blockTimestamp"
        );
        assert.strictEqual(
          offset,
          pastTimestamp - startTime + increment,
          "Unexpected offset"
        );
      });
    });
  });
});
