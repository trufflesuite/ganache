import assert from "assert";
import {
  ClockBasedBlockTime,
  IncrementBasedBlockTime
} from "../src/block-time";

const pastTimestamp = new Date("2010-01-27T16:42:33.875Z");
const midTimestamp = new Date("2021-06-04T16:42:33.875Z");
const futureTimestamp = new Date("2022-04-06T16:42:33.875Z");
const duration = 843248;

describe("block-time", () => {
  describe("ClockBasedBlockTime", () => {
    type TickingReferenceClock<T extends number | Date> = {
      (): T;
      tick: (duration: number) => void;
    };

    // create a reference clock that always returns the internal representation of time, in the same type as the
    // initialTimestampMilliseconds provided the internal time can be incremented by any arbitrary number of
    // milliseconds by calling `referenceClock.tick(duration);`
    function createTickingReferenceClock<T extends number | Date>(
      initialTimestampMilliseconds: T
    ): TickingReferenceClock<T> {
      const isNumber = typeof initialTimestampMilliseconds === "number";
      let timestamp = +initialTimestampMilliseconds;

      const clock = () => (isNumber ? timestamp : new Date(timestamp)) as T;
      clock.tick = tickMilliseconds => (timestamp += tickMilliseconds);

      return clock;
    }

    describe("constructor", () => {
      it("should throw with negative timestamp", () => {
        assert.throws(
          () => new ClockBasedBlockTime(-100, () => 0),
          new Error(`Invalid timestamp: -100. Value must be positive.`)
        );
      });
    });

    describe("getOffset()", () => {
      it("should get a positive offset", () => {
        [midTimestamp, +midTimestamp].forEach(referenceTimestamp => {
          const blockTime = new ClockBasedBlockTime(
            futureTimestamp,
            () => referenceTimestamp
          );
          const offset = blockTime.getOffset();

          assert(offset > 0, "Unexpected offset - offset should be positive");
          assert.strictEqual(
            offset,
            +futureTimestamp - +referenceTimestamp,
            "Unexpected offset"
          );
        });
      });

      it("should get a negative offset", () => {
        [midTimestamp, +midTimestamp].forEach(referenceTimestamp => {
          const blockTime = new ClockBasedBlockTime(
            pastTimestamp,
            () => referenceTimestamp
          );
          const offset = blockTime.getOffset();

          assert(offset < 0, "Unexpected offset - offset should be negative");
          assert.strictEqual(
            offset,
            +pastTimestamp - +referenceTimestamp,
            "Unexpected offset"
          );
        });
      });

      it("should get a neutral offset", () => {
        [midTimestamp, +midTimestamp].forEach(referenceTimestamp => {
          const blockTime = new ClockBasedBlockTime(
            referenceTimestamp,
            () => referenceTimestamp
          );
          const offset = blockTime.getOffset();

          assert.strictEqual(offset, 0, "Unexpected offset");
        });
      });
    });

    describe("setOffset()", () => {
      it("should set a positive offset", () => {
        [midTimestamp, +midTimestamp].forEach(referenceTimestamp => {
          const blockTime = new ClockBasedBlockTime(
            referenceTimestamp,
            () => referenceTimestamp
          );
          blockTime.setOffset(duration);
          const offset = blockTime.getOffset();

          assert.strictEqual(offset, duration, "Unexpected offset");
        });
      });

      it("should set a negative offset", () => {
        [midTimestamp, +midTimestamp].forEach(referenceTimestamp => {
          const blockTime = new ClockBasedBlockTime(
            referenceTimestamp,
            () => referenceTimestamp
          );
          blockTime.setOffset(-duration);
          const offset = blockTime.getOffset();

          assert.strictEqual(offset, -duration, "Unexpected offset");
        });
      });

      it("should set a netural offset", () => {
        [midTimestamp, +midTimestamp].forEach(referenceTimestamp => {
          const blockTime = new ClockBasedBlockTime(
            pastTimestamp,
            () => referenceTimestamp
          );
          blockTime.setOffset(0);
          const offset = blockTime.getOffset();

          assert.strictEqual(offset, 0, "Unexpected offset");
        });
      });

      it("should throw when resulting timestamp is negative", () => {
        [midTimestamp, +midTimestamp].forEach(referenceTimestamp => {
          const blockTime = new ClockBasedBlockTime(
            referenceTimestamp,
            () => referenceTimestamp
          );

          assert.throws(() => blockTime.setOffset(-referenceTimestamp - 1));
        });
      });
    });

    describe("setTime", () => {
      it("should return a positive offset when setting a time in the future", () => {
        [midTimestamp, +midTimestamp].forEach(referenceTimestamp => {
          const blockTime = new ClockBasedBlockTime(
            referenceTimestamp,
            () => referenceTimestamp
          );
          const offset = blockTime.setTime(futureTimestamp);

          assert.strictEqual(
            offset,
            +futureTimestamp - +referenceTimestamp,
            "Unexpected offset"
          );
        });
      });

      it("should return a negative offset when setting a time in the past", () => {
        [midTimestamp, +midTimestamp].forEach(referenceTimestamp => {
          const blockTime = new ClockBasedBlockTime(
            referenceTimestamp,
            () => referenceTimestamp
          );
          const offset = blockTime.setTime(pastTimestamp);

          assert.strictEqual(
            offset,
            +pastTimestamp - +referenceTimestamp,
            "Unexpected offset"
          );
        });
      });

      it("should throw with negative timestamp", () => {
        const blockTime = new ClockBasedBlockTime(midTimestamp, () => midTimestamp);

        assert.throws(
          () => blockTime.setTime(-100),
          new Error(`Invalid timestamp: -100. Value must be positive.`)
        );
      });
    });

    describe("createBlockTimestamp()", () => {
      it("should create a sequence of incrementing block timestamps", () => {
        [midTimestamp, +midTimestamp].forEach(startTime => {
          const clock = createTickingReferenceClock(startTime);
          const blockTime = new ClockBasedBlockTime(startTime, clock);

          for (let i = 0; i < 10; i++) {
            const expectedTimestampSeconds = Math.floor(+clock() / 1000);

            const blockTimestamp = blockTime.createBlockTimestampInSeconds();
            assert.strictEqual(blockTimestamp, expectedTimestampSeconds);

            // tick the clock a random duration up to 2 minutes
            clock.tick(Math.floor(Math.random() * 120000));
          }
        });
      });

      it("should create a sequence of incrementing blockTimestamps with a positive offset", () => {
        [midTimestamp, +midTimestamp].forEach(startTime => {
          const clock = createTickingReferenceClock(startTime);
          const blockTime = new ClockBasedBlockTime(startTime, clock);
          blockTime.setOffset(duration);

          for (let i = 0; i < 10; i++) {
            const expectedTimestampSeconds = Math.floor((+clock() + duration) / 1000);

            const blockTimestamp = blockTime.createBlockTimestampInSeconds();
            assert.strictEqual(blockTimestamp, expectedTimestampSeconds);

            // tick the clock a random duration up to 2 minutes
            clock.tick(Math.floor(Math.random() * 120000));
          }
        });
      });

      it("should create a sequence of incrementing blockTimestamps with a negative offset", () => {
        [midTimestamp, +midTimestamp].forEach(startTime => {
          const clock = createTickingReferenceClock(startTime);
          const blockTime = new ClockBasedBlockTime(startTime, clock);
          blockTime.setOffset(-duration);

          for (let i = 0; i < 10; i++) {
            const expectedTimestampSeconds = Math.floor((+clock() - duration) / 1000);

            const blockTimestamp = blockTime.createBlockTimestampInSeconds();
            assert.strictEqual(blockTimestamp, expectedTimestampSeconds);

            // tick the clock a random duration up to 2 minutes
            clock.tick(Math.floor(Math.random() * 120000));
          }
        });
      });
    });

    describe("createBlockTimestamp(timestamp)", () => {
      it("should create a blockTimestamp equal to the specified timestamp with a positive offset", () => {
        [midTimestamp, +midTimestamp].forEach(referenceTimestamp => {
          const blockTime = new ClockBasedBlockTime(
            referenceTimestamp,
            () => referenceTimestamp
          );

          const blockTimestamp = blockTime.createBlockTimestampInSeconds(
            +futureTimestamp
          );
          const offset = blockTime.getOffset();

          assert(offset > 0);
          assert.strictEqual(
            blockTimestamp,
            Math.floor(+futureTimestamp / 1000),
            "Unexpected blockTimestamp"
          );
          assert.strictEqual(
            offset,
            +futureTimestamp - +referenceTimestamp,
            "Unexpected offset"
          );
        });
      });

      it("should create a blockTimestamp equal to the specified timestamp with a negative offset", () => {
        [midTimestamp, +midTimestamp].forEach(referenceTimestamp => {
          const blockTime = new ClockBasedBlockTime(
            referenceTimestamp,
            () => referenceTimestamp
          );

          const blockTimestamp = blockTime.createBlockTimestampInSeconds(
            +pastTimestamp
          );
          const offset = blockTime.getOffset();

          assert(offset < 0);
          assert.strictEqual(
            blockTimestamp,
            Math.floor(+pastTimestamp / 1000),
            "Unexpected blockTimestamp"
          );
          assert.strictEqual(
            offset,
            +pastTimestamp - +referenceTimestamp,
            "Unexpected offset"
          );
        });
      });
    });
  });

  describe("IncrementBasedBlockTime", () => {
    const increment = 1000;

    describe("constructor", () => {
      it("should throw with negative timestamp", () => {
        assert.throws(
          () => new IncrementBasedBlockTime(-100, increment),
          new Error(`Invalid timestamp: -100. Value must be positive.`)
        );
      });
    });

    describe("getOffset()", () => {
      it("should get an initial offset of zero", () => {
        [midTimestamp, +midTimestamp, 0].forEach(startTime => {
          const blockTime = new IncrementBasedBlockTime(startTime, increment);
          assert.strictEqual(blockTime.getOffset(), 0);
        });
      });
    });

    describe("setOffset()", () => {
      it("should set a positive offset", () => {
        [midTimestamp, +midTimestamp].forEach(startTime => {
          const blockTime = new IncrementBasedBlockTime(startTime, increment);
          blockTime.setOffset(duration);
          const offset = blockTime.getOffset();
          assert.strictEqual(offset, duration, "Unexpected offset");
        });
      });

      it("should set a negative offset", () => {
        [midTimestamp, +midTimestamp].forEach(startTime => {
          const blockTime = new IncrementBasedBlockTime(startTime, increment);
          blockTime.setOffset(-duration);
          const offset = blockTime.getOffset();

          assert.strictEqual(offset, -duration, "Unexpected offset");
        });
      });

      it("should set a netural offset", () => {
        const blockTime = new IncrementBasedBlockTime(pastTimestamp, increment);
        blockTime.setOffset(0);
        const offset = blockTime.getOffset();

        assert.strictEqual(offset, 0, "Unexpected offset");
      });

      it("should throw when resulting timestamp is negative", () => {
        [midTimestamp, +midTimestamp].forEach(startTime => {
          const blockTime = new IncrementBasedBlockTime(startTime, increment);

          assert.throws(() => blockTime.setOffset(-startTime - 1));
        });
      });
    });

    describe("setTime", () => {
      it("should return a positive offset when setting a time in the future", () => {
        [midTimestamp, +midTimestamp].forEach(startTime => {
          const blockTime = new IncrementBasedBlockTime(startTime, increment);
          const offset = blockTime.setTime(futureTimestamp);

          assert.strictEqual(
            offset,
            +futureTimestamp - +startTime,
            "Unexpected offset"
          );
        });
      });

      it("should return a negative offset when setting a time in the past", () => {
        [midTimestamp, +midTimestamp].forEach(startTime => {
          const blockTime = new IncrementBasedBlockTime(startTime, increment);

          const offset = blockTime.setTime(pastTimestamp);

          assert.strictEqual(
            offset,
            +pastTimestamp - +startTime,
            "Unexpected offset"
          );
        });
      });

      it("should throw with negative timestamp", () => {
        const blockTime = new IncrementBasedBlockTime(midTimestamp, increment);

        assert.throws(
          () => blockTime.setTime(-100),
          new Error(`Invalid timestamp: -100. Value must be positive.`)
        );
      });
    });

    describe("createBlockTimestamp()", () => {
      it("should create a sequence of incrementing block timestamps", () => {
        [midTimestamp, +midTimestamp].forEach(startTime => {
          const blockTime = new IncrementBasedBlockTime(startTime, increment);

          for (let i = 0; i < 10; i++) {
            // increment happens _after_ creating the block timestamp
            const expectedTimestampSeconds = Math.floor(
              (+startTime + i * increment) / 1000
            );

            const blockTimestamp = blockTime.createBlockTimestampInSeconds();
            assert.strictEqual(blockTimestamp, expectedTimestampSeconds);
          }
        });
      });

      it("should create a sequence of incrementing blockTimestamps with a positive offset", () => {
        [midTimestamp, +midTimestamp].forEach(startTime => {
          const blockTime = new IncrementBasedBlockTime(startTime, increment);
          blockTime.setOffset(duration);

          for (let i = 0; i < 10; i++) {
            // increment happens _after_ creating the block timestamp
            const expectedTimestampSeconds = Math.floor(
              (+startTime + i * increment + duration) / 1000
            );

            const blockTimestamp = blockTime.createBlockTimestampInSeconds();
            assert.strictEqual(blockTimestamp, expectedTimestampSeconds);
          }
        });
      });

      it("should create a sequence of incrementing blockTimestamps with a negative offset", () => {
        [midTimestamp, +midTimestamp].forEach(startTime => {
          const blockTime = new IncrementBasedBlockTime(startTime, increment);
          blockTime.setOffset(-duration);

          for (let i = 0; i < 10; i++) {
            // increment happens _after_ creating the block timestamp
            const expectedTimestampSeconds = Math.floor(
              (+startTime + i * increment - duration) / 1000
            );

            const blockTimestamp = blockTime.createBlockTimestampInSeconds();
            assert.strictEqual(blockTimestamp, expectedTimestampSeconds);
          }
        });
      });
    });

    describe("createBlockTimestamp(timestamp)", () => {
      it("should create a blockTimestamp equal to the specified timestamp with a positive offset", () => {
        [midTimestamp, +midTimestamp].forEach(startTime => {
          const blockTime = new IncrementBasedBlockTime(startTime, increment);

          const blockTimestamp = blockTime.createBlockTimestampInSeconds(
            +futureTimestamp
          );
          const offset = blockTime.getOffset();

          assert(offset > 0);
          assert.strictEqual(
            blockTimestamp,
            Math.floor(+futureTimestamp / 1000),
            "Unexpected blockTimestamp"
          );
          assert.strictEqual(
            offset,
            +futureTimestamp - +startTime,
            "Unexpected offset"
          );
        });
      });

      it("should create a blockTimestamp equal to the specified timestamp with a negative offset", () => {
        [midTimestamp, +midTimestamp].forEach(startTime => {
          const blockTime = new IncrementBasedBlockTime(startTime, increment);

          const blockTimestamp = blockTime.createBlockTimestampInSeconds(
            +pastTimestamp
          );
          const offset = blockTime.getOffset();

          assert(offset < 0);
          assert.strictEqual(
            blockTimestamp,
            Math.floor(+pastTimestamp / 1000),
            "Unexpected blockTimestamp"
          );
          assert.strictEqual(
            offset,
            +pastTimestamp - +startTime,
            "Unexpected offset"
          );
        });
      });
    });
  });
});
