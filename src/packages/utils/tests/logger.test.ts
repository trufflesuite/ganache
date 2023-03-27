import assert from "assert";
import { createLogger } from "../src/things/logger";
import { openSync, promises, closeSync, writeSync } from "fs";
const { readFile, unlink } = promises;

describe("createLogger()", () => {
  const fixturePath = `./tests/logger-test-fixture.log`;
  const getFixtureDescriptor = () => openSync(fixturePath, "a");
  const onError = (err: Error) => {};

  afterEach(() => unlink(fixturePath).catch(err => {}));

  const createBaseLogger = () => {
    const calls: any[][] = [];
    return {
      baseLogger: {
        log: (message, ...params) => {
          calls.push([message, ...params]);
        }
      },
      calls
    };
  };

  describe("baseLogger", () => {
    it("binds the log function to the baseLogger", () => {
      const baseLogger = {
        log: function () {
          assert.strictEqual(
            this,
            baseLogger,
            "`this` does not reference the baseLogger"
          );
        }
      };

      const logger = createLogger({ baseLogger });

      logger.log("test message");
    });

    it("binds the log function to the baseLogger, when a file is specified", async () => {
      const baseLogger = {
        log: function () {
          assert.strictEqual(
            this,
            baseLogger,
            "`this` does not reference the baseLogger"
          );
        }
      };

      const file = getFixtureDescriptor();
      const logger = createLogger({ baseLogger, file });

      logger.log("test message");
    });

    it("uses the reassigned log function", () => {
      const baseLogger = {
        log: (message: any, ...optionalArgs: any[]) => {}
      };

      const logger = createLogger({ baseLogger });

      baseLogger.log = (message: any, ...optionalArgs: any[]) => {
        assert.strictEqual(message, "test message");
        assert.deepStrictEqual(optionalArgs, ["param1", "param2"]);
      };

      logger.log("test message", "param1", "param2");
    });
  });

  describe("log()", () => {
    const splitLogLine = (logLine: string) => {
      // The log line is in the format:
      // `<timestamp> <message>`
      // where the timestamp is 24 characters long
      // the delimiting space is at index 24
      // and the message starts at index 25
      const timestampPart = logLine.slice(0, 24);
      const delimiter = logLine[24];
      const messagePart = logLine.slice(25);

      return {
        timestampPart,
        delimiter,
        messagePart
      };
    };

    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

    const message = "test message";

    it("creates a baseLogger() logger", () => {
      const { baseLogger, calls } = createBaseLogger();
      const { log } = createLogger({ baseLogger });

      log(message);

      assert.deepStrictEqual(
        calls.length,
        1,
        "baseLogger() was called unexpected number of times."
      );

      assert.deepStrictEqual(calls, [[message]]);
    });

    it("still calls baseLogger() when a file is specified", async () => {
      const fd = getFixtureDescriptor();

      const { baseLogger, calls } = createBaseLogger();

      const { log, close } = createLogger({
        file: fd,
        baseLogger,
        onError
      });

      try {
        log(message);
        await close();
      } catch (err) {
        // logger.close() will close the underlying descriptor, so this only needs to
        // happen if it fails
        closeSync(fd);
        throw err;
      }

      assert.strictEqual(
        calls.length,
        1,
        "baseLogger() was called unexpected number of times."
      );

      assert.deepStrictEqual(calls, [[message]]);
    });

    it("writes to the file provided", async () => {
      const fd = getFixtureDescriptor();

      const { baseLogger } = createBaseLogger();

      const { log, close } = createLogger({
        file: fd,
        baseLogger,
        onError
      });

      try {
        log(`${message} 0`);
        log(`${message} 1`);
        log(`${message} 2`);
        await close();
      } catch (err) {
        // logger.close() will close the underlying descriptor, so only need to
        // explicitly close the descriptor if it fails to close
        closeSync(fd);
        throw err;
      }

      const fileContents = await readFile(fixturePath, "utf8");
      const logLines = fileContents.split("\n");

      // 4, because there's a \n at the end of each line, creating an empty entry
      assert.strictEqual(logLines.length, 4);
      assert.strictEqual(logLines[3], "");

      logLines.slice(0, 3).forEach((logLine, lineNumber) => {
        const { timestampPart, delimiter, messagePart } = splitLogLine(logLine);

        assert(timestampRegex.test(timestampPart), "Unexpected timestamp.");
        assert.strictEqual(delimiter, " ", "Unexpected delimiter.");
        assert.strictEqual(
          messagePart,
          `${message} ${lineNumber}`,
          "Unexpected message."
        );
      });
    });

    it("timestamps each line on multi-line log messages", async () => {
      const fd = getFixtureDescriptor();

      const { baseLogger } = createBaseLogger();

      const { log, close } = createLogger({
        file: fd,
        baseLogger,
        onError
      });

      const expectedLines = ["multi", "line", "message"];

      let loggedLines: string[];
      try {
        log(expectedLines.join("\n"));
        await close();
      } catch (err) {
        // logger.close() will close the underlying descriptor, so only need to
        // explicitly close the descriptor if it fails to close
        closeSync(fd);
        throw err;
      }

      const fileContents = await readFile(fixturePath, "utf8");
      loggedLines = fileContents.split("\n");

      // 4, because there's a \n at the end of each line, creating an empty entry
      assert.strictEqual(loggedLines.length, 4);
      assert.strictEqual(loggedLines[3], "");

      loggedLines.slice(0, 3).forEach((logLine, lineNumber) => {
        const { timestampPart, delimiter, messagePart } = splitLogLine(logLine);

        assert(timestampRegex.test(timestampPart), "Unexpected timestamp");
        assert.strictEqual(delimiter, " ", "Unexpected delimiter");
        assert.strictEqual(messagePart, expectedLines[lineNumber]);
      });
    });

    it("throws if the file descriptor is invalid", async () => {
      // unlikely that this will be a valid file descriptor
      const fd = 1234567890;
      const { baseLogger } = createBaseLogger();

      // this is a strange kinda promise, because it *resolves* to an Error
      const errorRaised: NodeJS.ErrnoException = await new Promise<Error>(
        resolve => {
          const { log, close } = createLogger({
            file: fd,
            baseLogger,
            onError: err => resolve(err)
          });

          log("Invalid descriptor");

          close();
        }
      );

      assert.strictEqual(errorRaised.code, "EBADF");
    });

    it("continues to log to baseLogger after file descriptor is closed", async () => {
      const { baseLogger, calls } = createBaseLogger();
      const fd = getFixtureDescriptor();

      const { log, close } = createLogger({
        file: fd,
        baseLogger,
        onError
      });

      closeSync(fd);

      log("Oh noes!");
      log("The descriptor is cloes[d]!");

      await close();

      assert.deepStrictEqual(calls, [
        ["Oh noes!"],
        ["The descriptor is cloes[d]!"]
      ]);
    });
  });

  describe("close()", () => {
    it("closes the underlying descriptor", async () => {
      const fd = getFixtureDescriptor();
      const { baseLogger } = createBaseLogger();
      const { close } = createLogger({
        file: fd,
        onError,
        baseLogger
      });

      try {
        await close();
      } catch (err) {
        // logger.close() will close the underlying descriptor, so only need to
        // explicitly close the descriptor if it fails to close
        closeSync(fd);
        throw err;
      }

      assert.throws(() => writeSync(fd, "Descriptor is closed"), {
        code: "EBADF"
      });
    });
  });
});
