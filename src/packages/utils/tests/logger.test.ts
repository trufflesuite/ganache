import assert from "assert";
import { createLogger } from "../src/things/logger";
import { openSync, promises } from "fs";
const { readFile, unlink } = promises;

describe("createLogger()", () => {
  const getFileDescriptor = (slug: string) => {
    const path = `./tests/test-${slug}.log`;
    return {
      path,
      descriptor: openSync(path, "a")
    };
  };

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
    it("should create a baseLog() logger by default", () => {
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

      const { log, getCompletionHandle, close } = createLogger({
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
        await close();
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

        assert(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(timestampPart),
          "Unexpected timestamp."
        );
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

      const { log, getCompletionHandle, close } = createLogger({
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
        await close();
        await unlink(path);
      }

      // length == 4, because there's a \n at the end (string.split() results
      // in an empty string)
      assert.strictEqual(loggedLines.length, 4);
      assert.strictEqual(loggedLines[3], "");

      loggedLines.slice(0, 3).forEach((logLine, lineNumber) => {
        const timestampPart = logLine.slice(0, 24);
        const messagePart = logLine.slice(25);
        const delimiter = logLine[24];

        assert(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(timestampPart),
          "Unexpected timestamp"
        );
        assert.strictEqual(delimiter, " ", "Unexpected delimiter");
        assert.strictEqual(messagePart, expectedLines[lineNumber]);
      });
    });

    it("should not throw if the underlying file does not exist", async () => {
      const { descriptor, path } = getFileDescriptor(
        "underlying-file-does-not-exist"
      );
      const { baseLog } = createBaseLogger();

      const { log, getCompletionHandle, close } = createLogger({
        file: descriptor,
        baseLog
      });

      try {
        log(message);
        await getCompletionHandle();
      } finally {
        await close();
        await unlink(path);
      }
    });
  });
  describe("close()", () => {
    it("needs tests!", () => {
      throw new Error("needs tests!");
    });
  });
});
