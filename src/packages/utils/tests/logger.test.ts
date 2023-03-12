import assert from "assert";
import { createLogger } from "../src/things/logger";
import { openSync, promises, closeSync } from "fs";
const { readFile, unlink } = promises;

const getFileDescriptor = (slug: string) => {
  const path = `./tests/test-${slug}.log`;
  return {
    path,
    descriptor: openSync(path, "a")
  };
};

const splitLogLine = (logLine: string) => {
  // The log line is in the format:
  // `<timestamp> <message>`
  // where the timestamp is 24 characters long
  // the delimiting space is at index 24
  // and the message starts at index 25  const timestampPart = logLine.slice(0, 24);
  const timestampPart = logLine.slice(0, 24);
  const delimiter = logLine[24];
  const messagePart = logLine.slice(25);

  return {
    timestampPart,
    delimiter,
    messagePart
  };
};

describe("createLogger()", () => {
  const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  const createbaseLoggerger = () => {
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

  const message = "test message";

  describe("log()", () => {
    it("should create a baseLogger() logger", () => {
      const { baseLogger, calls } = createbaseLoggerger();
      const { log } = createLogger({ baseLogger });

      log(message);

      assert.strictEqual(
        calls.length,
        1,
        "baseLogger() was called unexpected number of times."
      );

      const baseLoggerArgs = calls[0];

      assert.deepStrictEqual(
        baseLoggerArgs,
        [message],
        "baseLogger() called with unexpected arguments."
      );
    });

    it("should still call baseLogger() when a file is specified", async () => {
      const { descriptor, path } = getFileDescriptor("write-to-console");
      const { baseLogger, calls } = createbaseLoggerger();

      const { log, getCompletionHandle } = createLogger({
        file: descriptor,
        baseLogger
      });

      try {
        log(message);
        await getCompletionHandle();
      } finally {
        closeSync(descriptor);
        await unlink(path);
      }

      assert.strictEqual(
        calls.length,
        1,
        "baseLogger() was called unexpected number of times."
      );

      const args = calls[0];

      assert.deepStrictEqual(
        args,
        [message],
        "baseLogger() called with unexpected arguments."
      );
    });

    it("should write to the file provided", async () => {
      const { descriptor, path } = getFileDescriptor("write-to-file-provided");
      const { baseLogger } = createbaseLoggerger();

      const { log, getCompletionHandle } = createLogger({
        file: descriptor,
        baseLogger
      });

      let fileContents: string;
      try {
        log(`${message} 0`);
        log(`${message} 1`);
        log(`${message} 2`);
        await getCompletionHandle();

        fileContents = await readFile(path, "utf8");
      } finally {
        closeSync(descriptor);
        await unlink(path);
      }

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

    it("should timestamp each line on multi-line log messages", async () => {
      const { descriptor, path } = getFileDescriptor("timestamp-each-line");
      const { baseLogger } = createbaseLoggerger();

      const { log, getCompletionHandle } = createLogger({
        file: descriptor,
        baseLogger
      });

      const expectedLines = ["multi", "line", "message"];

      let loggedLines: string[];
      try {
        log(expectedLines.join("\n"));
        await getCompletionHandle();

        const fileContents = await readFile(path, "utf8");
        loggedLines = fileContents.split("\n");
      } finally {
        closeSync(descriptor);
        await unlink(path);
      }

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

    it("should throw if the file descriptor is invalid", async () => {
      // unlikely that this will be a valid file descriptor
      const descriptor = 1234567890;
      const { baseLogger } = createbaseLoggerger();

      const { log, getCompletionHandle } = createLogger({
        file: descriptor,
        baseLogger
      });

      log("descriptor is invalid");

      await assert.rejects(getCompletionHandle(), { code: "EBADF" });
    });
  });
});
