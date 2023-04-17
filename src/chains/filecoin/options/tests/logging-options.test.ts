import assert from "assert";
import { FilecoinOptionsConfig } from "../src";
import sinon from "sinon";
import { promises, closeSync } from "fs";
const { unlink, open, readFile } = promises;
import tmp from "tmp-promise";
import { resolve } from "path";
import { URL } from "url";
import { EOL } from "os";

describe("FilecoinOptionsConfig", () => {
  describe("logging", () => {
    describe("options", async () => {
      function assertLogLine(logLine: string, message: string) {
        const timestampPart = logLine.substring(0, 24);

        const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

        assert(
          timestampPart.match(timestampRegex),
          `Unexpected timestamp from file ${timestampPart}`
        );

        const messagePart = logLine.substring(25);

        assert.strictEqual(messagePart, message, "Message does not match");
      }

      tmp.setGracefulCleanup();
      // we use tmp.dir() rather than tmp.file() here, because we don't want the file to exist
      const tempFileDir = (await tmp.dir()).path;
      const logfilePath = resolve(tempFileDir, "temp-file.log");

      let spy: any;

      beforeEach(() => {
        spy = sinon.spy(console, "log");
      });

      afterEach(async () => {
        spy.restore();

        // tmp should clean up after itself, but we don't want the logfile to exist for the next test
        await unlink(logfilePath).catch(() => {});
      });

      describe("logger", () => {
        it("uses console.log by default", () => {
          const message = "message";
          const options = FilecoinOptionsConfig.normalize({});
          options.logging.logger.log(message);
          assert.strictEqual(spy.withArgs(message).callCount, 1);
        });
      });

      describe("file", () => {
        it("resolves a file path to descriptor", async () => {
          const options = FilecoinOptionsConfig.normalize({
            logging: { file: logfilePath }
          });
          assert(typeof options.logging.file === "number");
          assert.doesNotThrow(
            () => closeSync(options.logging.file),
            "File descriptor not valid"
          );
        });

        it("resolves a file path as Buffer to descriptor", async () => {
          const options = FilecoinOptionsConfig.normalize({
            logging: { file: Buffer.from(logfilePath, "utf8") }
          });
          assert(typeof options.logging.file === "number");
          assert.doesNotThrow(
            () => closeSync(options.logging.file),
            "File descriptor not valid"
          );
        });

        it("resolves a file URL as Buffer to descriptor", async () => {
          const options = FilecoinOptionsConfig.normalize({
            logging: { file: new URL(`file://${logfilePath}`) }
          });
          assert(typeof options.logging.file === "number");
          assert.doesNotThrow(
            () => closeSync(options.logging.file),
            "File descriptor not valid"
          );
        });

        it("fails if the process doesn't have write access to the file path provided", async () => {
          tmp.withFile(async ({ path }) => {
            const handle = await open(path, "w");
            // set no permissions on the file
            await handle.chmod(0);
            await handle.close();

            const errorMessage = `Failed to open log file ${path}. Please check if the file path is valid and if the process has write permissions to the directory.${EOL}`; // the specific error that follows this is OS dependent

            assert.throws(
              () =>
                FilecoinOptionsConfig.normalize({
                  logging: { file: path }
                }),
              (error: Error) => error.message.startsWith(errorMessage)
            );
          });
        });

        it("should append to the specified file", async () => {
          const message = "message";
          const handle = await open(logfilePath, "w");
          await handle.write(`existing content${EOL}`);
          await handle.close();

          const options = FilecoinOptionsConfig.normalize({
            logging: { file: logfilePath }
          });
          try {
            options.logging.logger.log(message);

            const readHandle = await open(logfilePath, "r");
            const content = await readHandle.readFile({ encoding: "utf8" });
            await readHandle.close();

            const lines = content.split(EOL);

            assert.strictEqual(lines.length, 3); // 2 lines + empty line at the end
            assert.strictEqual(lines[0], "existing content");

            assertLogLine(lines[1], message);
          } finally {
            await options.logging.logger.close();
          }
        });

        it("uses the provided logger, and file when both `logger` and `file` are provided", async () => {
          const calls: any[] = [];
          const logger = {
            log: (message: any, ...params: any[]) => {
              calls.push([message, ...params]);
            }
          };

          const options = FilecoinOptionsConfig.normalize({
            logging: {
              logger,
              file: logfilePath
            }
          });

          options.logging.logger.log("message", "param1", "param2");
          await options.logging.logger.close();
          assert.deepStrictEqual(calls, [["message", "param1", "param2"]]);

          const fromFile = await readFile(logfilePath, "utf8");
          assert(fromFile !== "", "Nothing written to the log file");

          const lines = fromFile.split(EOL);
          assert.strictEqual(lines.length, 2); // 1 line + empty line at the end
          assertLogLine(lines[0], "message param1 param2");
          assert.strictEqual(lines[1], "");
        });
      });
    });
  });
});
