import assert from "assert";
import { resolve } from "path";
import { createLogger } from "../src/logger";
import { readFile, unlink } from "fs/promises";

describe("createLogger()", () => {
  const getFilePath = (slug: string) => `./tests/test-${slug}.log`;

  const createBaseLogger = () => {
    const calls: any[][] = [];
    return {
      baseLog: (message, ...params) => {
        calls.push([message, ...params]);
      },
      calls
    };
  };
  const invalidFilePath = resolve("");

  const message = "test message";

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
    const file = getFilePath("write-to-console");
    const { baseLog, calls } = createBaseLogger();

    const { log, getCompletionPromise } = createLogger({ file, baseLog });

    try {
      log(message);
      await getCompletionPromise();
    } finally {
      await unlink(file);
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
    const file = getFilePath("write-to-file-provided");
    const { baseLog } = createBaseLogger();

    const { log, getCompletionPromise, close } = createLogger({
      file,
      baseLog
    });

    let fileContents: string;
    try {
      log(`${message} 0`);
      log(`${message} 1`);
      log(`${message} 2`);
      await getCompletionPromise();

      fileContents = await readFile(file, "utf8");
    } finally {
      await close();
      await unlink(file);
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
    const file = getFilePath("timestamp-each-line");
    const { baseLog } = createBaseLogger();

    const { log, getCompletionPromise, close } = createLogger({
      file,
      baseLog
    });

    const expectedLines = ["multi", "line", "message"];

    let loggedLines: string[];
    try {
      log(expectedLines.join("\n"));
      await getCompletionPromise();

      const fileContents = await readFile(file, "utf8");
      loggedLines = fileContents.split("\n");
    } finally {
      await close();
      await unlink(file);
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
    const file = getFilePath("underlying-file-does-not-exist");
    const { baseLog } = createBaseLogger();

    const { log, getCompletionPromise, close } = createLogger({
      file,
      baseLog
    });

    try {
      log(message);
      await getCompletionPromise();
    } finally {
      await close();
      await unlink(file);
    }
  });

  it("should reject waitHandle if the underlying file is inaccessible", async () => {
    const { baseLog } = createBaseLogger();

    const { log, getCompletionPromise } = createLogger({
      file: invalidFilePath,
      baseLog
    });

    log(message);

    await assert.rejects(getCompletionPromise());
  });
});
