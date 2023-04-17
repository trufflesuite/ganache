import assert from "assert";
import sinon from "sinon";
import { createLogger } from "../src/things/logger";
import { openSync, promises, closeSync, writeSync } from "fs";
const { unlink, readFile } = promises;
import { EOL } from "os";
import tmp from "tmp-promise";
import { resolve } from "path";

describe("createLogger()", async () => {
  tmp.setGracefulCleanup();
  // we use tmp.dir() rather than tmp.file() here, because we don't want the file to exist
  const tempFileDir = (await tmp.dir()).path;
  const logfilePath = resolve(tempFileDir, "log-file.log");

  const getFixtureDescriptor = () => openSync(logfilePath, "a");

  afterEach(async () => {
    await unlink(logfilePath).catch(() => {});
  });

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
      try {
        const logger = createLogger({ baseLogger, file });

        logger.log("test message");
        await logger.close();
      } catch {
        // logger.close() will close the underlying descriptor, so this only needs to
        // happen if it fails
        closeSync(file);
      }
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
      const file = getFixtureDescriptor();

      const { baseLogger, calls } = createBaseLogger();

      const { log, close } = createLogger({
        file,
        baseLogger
      });

      try {
        log(message);
        await close();
      } catch (err) {
        // logger.close() will close the underlying descriptor, so this only needs to
        // happen if it fails
        closeSync(file);
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
      const file = getFixtureDescriptor();

      const { baseLogger } = createBaseLogger();

      const { log, close } = createLogger({
        file,
        baseLogger
      });

      try {
        log(`${message} 0`);
        log(`${message} 1`);
        log(`${message} 2`);
        await close();
      } catch (err) {
        // logger.close() will close the underlying descriptor, so only need to
        // explicitly close the descriptor if it fails to close
        closeSync(file);
        throw err;
      }

      const fileContents = await readFile(logfilePath, "utf8");
      const logLines = fileContents.split(EOL);

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

    const endsOfLine = [
      { eol: "\r\n", identifier: "CRLF" },
      { eol: "\n", name: "LF" }
    ];

    endsOfLine.forEach(({ eol, identifier }) => {
      it(`timestamps each line on multi-line log messages split by ${identifier}`, async () => {
        const file = getFixtureDescriptor();

        const { baseLogger } = createBaseLogger();

        const { log, close } = createLogger({
          file,
          baseLogger
        });

        const expectedLines = ["multi", "line", "message"];

        let loggedLines: string[];
        try {
          log(expectedLines.join(eol));
          await close();
        } catch (err) {
          // logger.close() will close the underlying descriptor, so only need to
          // explicitly close the descriptor if it fails to close
          closeSync(file);
          throw err;
        }

        const fileContents = await readFile(logfilePath, "utf8");
        loggedLines = fileContents.split(/\n|\r\n/);
        // 4, because there's a \n at the end of each line, creating an empty entry
        assert.strictEqual(
          loggedLines.length,
          4,
          "Unexpected number of lines in the log file"
        );
        assert.strictEqual(loggedLines[3], "");

        loggedLines.slice(0, 3).forEach((logLine, lineNumber) => {
          const { timestampPart, delimiter, messagePart } =
            splitLogLine(logLine);

          assert(timestampRegex.test(timestampPart), "Unexpected timestamp");
          assert.strictEqual(delimiter, " ", "Unexpected delimiter");
          assert.strictEqual(messagePart, expectedLines[lineNumber]);
        });
      });
    });

    it("writes to stderr if the file descriptor is invalid", async () => {
      // unlikely that this will be a valid file descriptor
      const fd = 1234567890;
      const { baseLogger } = createBaseLogger();
      const spy = sinon.spy(console, "error");

      const { log, close } = createLogger({
        file: fd,
        baseLogger
      });

      log("Invalid descriptor");

      await close();

      assert.strictEqual(
        spy.withArgs(
          "Error writing to log file: EBADF: bad file descriptor, close"
        ).callCount,
        1
      );
      spy.restore();
    });

    it("continues to log to baseLogger after file descriptor is closed", async () => {
      const { baseLogger, calls } = createBaseLogger();
      const file = getFixtureDescriptor();

      const { log, close } = createLogger({
        file,
        baseLogger
      });

      closeSync(file);

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
      const file = getFixtureDescriptor();
      const { baseLogger } = createBaseLogger();
      const { close } = createLogger({
        file,
        baseLogger
      });

      try {
        await close();
      } catch (err) {
        // logger.close() will close the underlying descriptor, so only need to
        // explicitly close the descriptor if it fails to close
        closeSync(file);
        throw err;
      }

      assert.throws(() => writeSync(file, "Descriptor is closed"), {
        code: "EBADF"
      });
    });
  });
});
