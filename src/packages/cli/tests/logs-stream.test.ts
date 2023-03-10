import assert from "assert";
import {
  filterLogsStream,
  getLogsStream,
  createFollowReadStream
} from "../src/logs-stream";
import { Readable } from "stream";
import { appendFile, writeFile } from "fs/promises";
import { readFileSync } from "fs";

function readFromStream(stream: Readable): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream
      .on("data", chunk => chunks.push(chunk))
      .on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
      .on("error", reject);
  });
}

const fixturePath = "./tests/logs.fixture.log";
const fixtureContents = readFileSync(fixturePath, "utf8");

describe("logs-stream", () => {
  describe("createFollowReadStream()", () => {
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

      try {
        const logsReadAfterEOF = await new Promise<string>(
          (resolve, reject) => {
            const logLines: Buffer[] = [];

            logStream
              // start reading log lines immediately, otherwise the file contents are buffered
              .on("data", () => {})
              // we wait until eof, so that we can ignore everything that's already in the file
              .once("eof", () => {
                logStream
                  .on("data", data => logLines.push(data))
                  .once("eof", () => {
                    const logs = Buffer.concat(logLines).toString("utf8");
                    resolve(logs);
                  });
                appendFile(fixturePath, newLogLine);
              })
              .on("error", reject);
          }
        );

        assert.deepStrictEqual(logsReadAfterEOF, newLogLine);
      } finally {
        logStream.destroy();
        // rewrite the contents back to the fixture file, removing the additional data that we appended
        writeFile(fixturePath, fixtureContents);
      }
    });
  });

  describe("filterLogsStream()", () => {
    // First log stamped at "epoch"
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
      const expected = logLines.slice(logLinesToSkip).join("");

      const filteredStream = filterLogsStream({ input, since });

      const result = await readFromStream(filteredStream);

      assert.strictEqual(
        result,
        expected,
        `filterLogsStream() didn't correctly skip first ${logLinesToSkip} lines from the input log stream. Expected ${expected.length} bytes. Got ${result.length} bytes.`
      );
    });

    it("should only return lines stamped equal or earlier than the parameter passed as `since`", async () => {
      const logLinesToReturn = 4;
      // because the `until` parameter is inclusive, we must decrement by 1 in order to return the correct number of lines
      const until = timestampFromLineNumber(logLinesToReturn - 1);

      const input = Readable.from(logLines);
      const expected = logLines.slice(0, logLinesToReturn).join("");

      const filteredStream = filterLogsStream({ input, until });
      const result = await readFromStream(filteredStream);

      assert.strictEqual(
        result,
        expected,
        `filterLogsStream() didn't correctly return first ${logLinesToReturn} lines from the input log stream. Expected ${expected.length} bytes. Got ${result.length} bytes.`
      );
    });
  });

  describe("getLogsStream()", () => {
    it("should read the specified file", async () => {
      const logsStream = getLogsStream(fixturePath, {});
      const result = await readFromStream(logsStream);
      logsStream.destroy();

      assert.strictEqual(result, fixtureContents);
    });

    it("should filter the specified date range", async () => {
      const fixtureLines = fixtureContents.split("\n");
      const skipFromFront = 2;
      const skipFromBack = 2;

      const matchingLines = fixtureLines.slice(
        skipFromFront,
        fixtureLines.length - skipFromBack - 1 // -1 because 0-based index
      );

      const since = Date.parse(matchingLines[0].slice(0, 24));
      const until = Date.parse(
        matchingLines[matchingLines.length - 1].slice(0, 24)
      );

      const logsStream = getLogsStream(fixturePath, {
        since,
        until
      });

      const result = await readFromStream(logsStream);
      logsStream.destroy();

      assert.strictEqual(
        result,
        matchingLines.join("\n") + "\n",
        `expected only long lines since ${new Date(
          since
        ).toISOString()} and until ${new Date(until).toISOString()}`
      );
    });

    it("should follow the specified file", async () => {
      const newLogLine = `${new Date().toISOString()} new log line\n`;

      const logStream = getLogsStream(fixturePath, {
        follow: true
      });

      try {
        const logsReadAfterEOF = await new Promise<string>(
          (resolve, reject) => {
            const logLines: Buffer[] = [];

            logStream
              // start reading log lines immediately, otherwise the file contents are buffered
              .on("data", () => {})
              // we wait until eof, so that we can ignore everything that's already in the file
              .once("eof", () => {
                logStream
                  .on("data", data => logLines.push(data))
                  .once("eof", () => {
                    const logs = Buffer.concat(logLines).toString("utf8");
                    resolve(logs);
                  });
                appendFile(fixturePath, newLogLine);
              })
              .on("error", reject);
          }
        );

        assert.deepStrictEqual(logsReadAfterEOF, newLogLine);
      } finally {
        logStream.destroy();
        // rewrite the contents back to the fixture file, removing the additional data that we appended
        writeFile(fixturePath, fixtureContents);
      }
    });

    it("should follow the specified file, returning the filtered results", async () => {
      const fixtureLines = fixtureContents.split("\n");
      const skipFromFront = 2;
      const skipFromBack = 2;

      const matchingLines = fixtureLines.slice(
        skipFromFront,
        fixtureLines.length - skipFromBack - 1 // -1 because 0-based index
      );

      const since = Date.parse(matchingLines[0].slice(0, 24));
      const until = Date.parse(
        matchingLines[matchingLines.length - 1].slice(0, 24)
      );

      const tooEarlyLogLine = `${new Date(
        since - 10
      ).toISOString()} non-matching log line\n`;

      const matchingLogLine = `${new Date(
        since
      ).toISOString()} matching log line\n`;

      const tooLateLogLine = `${new Date(
        until + 10
      ).toISOString()} non-matching log line\n`;

      const logStream = getLogsStream(fixturePath, {
        since,
        until,
        follow: true
      });

      try {
        const logsReadAfterEOF = await new Promise<string>(
          (resolve, reject) => {
            const logLines: Buffer[] = [];

            logStream
              // start reading log lines immediately, otherwise the file contents are buffered
              .on("data", () => {})
              // we wait until eof, so that we can ignore everything that's already in the file
              .once("eof", () => {
                logStream
                  .on("data", data => logLines.push(data))
                  .once("eof", () => {
                    const logs = Buffer.concat(logLines).toString("utf8");
                    resolve(logs);
                  });
                appendFile(
                  fixturePath,
                  [tooEarlyLogLine, matchingLogLine, tooLateLogLine].join("\n")
                );
              })
              .on("error", reject);
          }
        );

        assert.deepStrictEqual(logsReadAfterEOF, matchingLogLine);
      } finally {
        logStream.destroy();
        // rewrite the contents back to the fixture file, removing the additional data that we appended
        writeFile(fixturePath, fixtureContents);
      }
    });
  });
});
