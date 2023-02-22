import assert from "assert";
import {
  filterLogsStream,
  getLogsStream,
  createFollowReadStream
} from "../src/logs-stream";
import { Readable } from "stream";
import { appendFile, writeFile } from "fs/promises";
import { readFileSync } from "fs";

describe("logs-stream", () => {
  const fixturePath = "./tests/logs.fixture.log";
  describe("createFollowReadStream()", () => {
    const fixtureContents = readFileSync(fixturePath, "utf8");

    it("should load all of the data from the file", async () => {
      const logStream = createFollowReadStream(fixturePath);

      const logs = await new Promise<string>((resolve, reject) => {
        const logLines: Buffer[] = [];

        logStream
          .on("data", data => logLines.push(data))
          .on("eof", () => {
            logStream.destroy();
            resolve(Buffer.concat(logLines).toString("utf8"));
          })
          .on("error", reject);
      });

      assert.deepStrictEqual(logs, fixtureContents);
    });

    it("should load data appended after reading to the end of file", async () => {
      const newLogLine = `${new Date().toISOString()} new log line\n`;

      const logStream = createFollowReadStream(fixturePath);

      // don't `await`, because we need to write the file back to it's original state
      const loadingLogs = await new Promise<string>((resolve, reject) => {
        const logLines: Buffer[] = [];

        logStream
          // start reading log lines immediately, otherwise the file contents are buffered
          .on("data", () => {})
          .once("eof", () => {
            logStream
              .on("data", data => logLines.push(data))
              .once("eof", () => {
                logStream.destroy();
                const logs = Buffer.concat(logLines).toString("utf8");
                resolve(logs);
              });
            appendFile(fixturePath, newLogLine);
          })
          .on("error", reject);
      });

      try {
        assert.deepStrictEqual(await loadingLogs, newLogLine);
      } finally {
        writeFile(fixturePath, fixtureContents);
      }
    });
  });

  describe("filterLogsStream()", () => {
    // First log stamped at epoch
    const epoch = Date.parse("2020-01-01 00:00:00 UTC");
    // subsequent logs are each incremented by 1 minute
    const timestampFromLineNumber = i => epoch + i * 60000;
    const logLines = [...new Array(1000)].map(
      (_, i) =>
        `${new Date(timestampFromLineNumber(i)).toISOString()} Log line ${i}\n`
    );

    it("should return the input stream when no filter parameters are provided", async () => {
      const input = Readable.from(logLines);

      const filteredStream = filterLogsStream({ input });

      assert.strictEqual(
        filteredStream,
        input,
        "filterLogsStream() didn't output the input stream by reference"
      );
    });

    it("should only return lines stamped equal to or later than the parameter passed as `since`", async () => {
      const logLinesToSkip = 100;
      const since = timestampFromLineNumber(logLinesToSkip);

      const input = Readable.from(logLines);
      const expected = Buffer.from(
        logLines.slice(logLinesToSkip).join(""),
        "utf8"
      );

      const filteredStream = filterLogsStream({ input, since });

      const result = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        filteredStream
          .on("data", chunk => chunks.push(chunk))
          .on("end", () => resolve(Buffer.concat(chunks)))
          .on("error", reject);
      });

      assert(
        result.equals(expected),
        `filterLogsStream() didn't correctly skip first ${logLinesToSkip} lines from the input log stream. Expected ${expected.length} bytes. Got ${result.length} bytes`
      );
    });

    it("should only return lines stamped equal or earlier than the parameter passed as `since`", async () => {
      const logLinesToReturn = 4;
      // because the `until` parameter is inclusive, we must decrement by 1 in order to return the correct number of lines
      const until = timestampFromLineNumber(logLinesToReturn - 1);

      const input = Readable.from(logLines);
      const expected = Buffer.from(
        logLines.slice(0, logLinesToReturn).join(""),
        "utf8"
      );

      const filteredStream = filterLogsStream({ input, until });

      const result = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        filteredStream
          .on("data", chunk => chunks.push(chunk))
          .on("end", () => resolve(Buffer.concat(chunks)))
          .on("error", reject);
      });

      assert(
        result.equals(expected),
        `filterLogsStream() didn't correctly return first ${logLinesToReturn} lines from the input log stream. Expected ${expected.length} bytes. Got ${result.length} bytes`
      );
    });
  });

  describe("getLogsStream()", () => {
    it("must be tested", () => {
      throw new Error("todo: implement getLogsStream() tests");
    });
  });
});
