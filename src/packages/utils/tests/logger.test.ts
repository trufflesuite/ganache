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

describe("createLogger()", () => {
  const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

  const createBaseLogger = () => {
    const calls: any[][] = [];
    return {
      baseLog: (message, ...params) => {
        calls.push([message, ...params]);
      },
      calls
    };
  };

  const message = "test message";

  describe("createLogger()", () => {
    it("should create a baseLog() logger", () => {
      const { baseLog, calls } = createBaseLogger();
      const { log } = createLogger({ baseLog });

      log(message);

      assert.strictEqual(
        calls.length,
        1,
        "baseLog() was called unexpected number of times."
      );

      const baseLogArgs = calls[0];

      assert.deepStrictEqual(
        baseLogArgs,
        [message],
        "baseLog() called with unexpected arguments."
      );
    });

    it("should still call baseLog() when a file is specified", async () => {
      const { descriptor, path } = getFileDescriptor("write-to-console");
      const { baseLog, calls } = createBaseLogger();

      const { log, getCompletionHandle } = createLogger({
        file: descriptor,
        baseLog
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
        "baseLog() was called unexpected number of times."
      );

      const args = calls[0];

      assert.deepStrictEqual(
        args,
        [message],
        "baseLog() called with unexpected arguments."
      );
    });

    it("should write to the file provided", async () => {
      const { descriptor, path } = getFileDescriptor("write-to-file-provided");
      const { baseLog } = createBaseLogger();

      const { log, getCompletionHandle } = createLogger({
        file: descriptor,
        baseLog
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

      // 4, because there's a \n at the end of each line
      assert.strictEqual(logLines.length, 4);
      assert.strictEqual(logLines[3], "");

      logLines.slice(0, 3).forEach((logLine, lineNumber) => {
        const timestampPart = logLine.slice(0, 24);
        const messagePart = logLine.slice(25);
        const delimiter = logLine[24];

        assert(timestampRegex.test(timestampPart), "Unexpected timestamp.");
        assert.strictEqual(delimiter, " ", "Unexpected delimiter.");
        assert.strictEqual(
          messagePart,
          `${message} ${lineNumber}`,
          "Unexpected message."
        );
      });
    });

    it("should not call baseLog() when `quiet`", async () => {
      const { baseLog, calls } = createBaseLogger();

      const { log } = createLogger({
        baseLog,
        quiet: true
      });

      log(message);

      assert.strictEqual(
        calls.length,
        0,
        "Expected baselogger to not have been called when `quiet` is specified"
      );
    });

    it("should write to the file, but not call baseLog() when `quiet`", async () => {
      const { descriptor, path } = getFileDescriptor("quiet-logger");
      const { baseLog, calls } = createBaseLogger();

      const { log, getCompletionHandle } = createLogger({
        file: descriptor,
        baseLog,
        quiet: true
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

      assert.strictEqual(
        calls.length,
        0,
        "Expected baselogger to not have been called when `quiet` is specified"
      );

      const logLines = fileContents.split("\n");

      // 4, because there's a \n at the end of each line
      assert.strictEqual(logLines.length, 4);
      assert.strictEqual(logLines[3], "");

      logLines.slice(0, 3).forEach((logLine, lineNumber) => {
        const timestampPart = logLine.slice(0, 24);
        const messagePart = logLine.slice(25);
        const delimiter = logLine[24];

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
      const { baseLog } = createBaseLogger();

      const { log, getCompletionHandle } = createLogger({
        file: descriptor,
        baseLog
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

      // length == 4, because there's a \n at the end (string.split() results
      // in each log line, follwed by an empty string)
      assert.strictEqual(loggedLines.length, 4);
      assert.strictEqual(loggedLines[3], "");

      loggedLines.slice(0, 3).forEach((logLine, lineNumber) => {
        const timestampPart = logLine.slice(0, 24);
        const messagePart = logLine.slice(25);
        const delimiter = logLine[24];

        assert(timestampRegex.test(timestampPart), "Unexpected timestamp");
        assert.strictEqual(delimiter, " ", "Unexpected delimiter");
        assert.strictEqual(messagePart, expectedLines[lineNumber]);
      });
    });

    it("should throw if the file descriptor is invalid", async () => {
      // unlikely that this will be a valid file descriptor
      const descriptor = 1234567890;
      const { baseLog } = createBaseLogger();

      const { log, getCompletionHandle } = createLogger({
        file: descriptor,
        baseLog
      });

      log("descriptor is invalid");

      await assert.rejects(getCompletionHandle(), { code: "EBADF" });
    });
  });
});
