import assert from "assert";
import { EthereumOptionsConfig } from "../src";
import sinon from "sinon";
import { resolve } from "path";
import { promises } from "fs";
const { unlink, readFile, open } = promises;
import { closeSync } from "fs";
import { URL } from "url";
import { EOL } from "os";
import tmp from "tmp-promise";

describe("EthereumOptionsConfig", () => {
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
        spy && spy.restore();

        await unlink(logfilePath).catch(() => {});
      });

      describe("logger", () => {
        it("uses a reassigned log function", async () => {
          const logger = {
            log: (message: any, ...optionalParams: any[]) => {}
          };

          const options = EthereumOptionsConfig.normalize({
            logging: { logger }
          });

          let called = false;

          // reassign log function
          logger.log = (message: any, ...optionalParams: any[]) => {
            called = true;
            assert.strictEqual(message, "Test message");
            assert.deepStrictEqual(optionalParams, ["param1", "param2"]);
          };

          options.logging.logger.log("Test message", "param1", "param2");
          assert(called);
        });

        it("uses a reassigned log function, when a file is specified", async () => {
          const logger = {
            log: (message: any, ...optionalParams: any[]) => {}
          };

          const options = EthereumOptionsConfig.normalize({
            logging: { logger, file: logfilePath }
          });

          let called = false;
          try {
            // reassign log function
            logger.log = (message: any, ...optionalParams: any[]) => {
              called = true;
              assert.strictEqual(message, "Test message");
              assert.deepStrictEqual(optionalParams, ["param1", "param2"]);
            };

            options.logging.logger.log("Test message", "param1", "param2");
            assert(called);
          } finally {
            await options.logging.logger.close();
          }
        });

        it("uses console.log by default", () => {
          const message = "message";
          const options = EthereumOptionsConfig.normalize({});
          options.logging.logger.log(message);
          assert.strictEqual(spy.withArgs(message).callCount, 1);
        });

        it("disables the logger when the quiet flag is used", () => {
          const message = "message";
          const options = EthereumOptionsConfig.normalize({
            logging: { quiet: true }
          });
          options.logging.logger.log(message);
          assert.strictEqual(spy.withArgs(message).callCount, 0);
        });

        it("calls the provided logger when quiet flag is used", () => {
          const logLines: string[][] = [];
          const options = EthereumOptionsConfig.normalize({
            logging: {
              quiet: true,
              logger: {
                log: (message: any, ...params: any[]) =>
                  logLines.push([message, ...params])
              }
            }
          });

          options.logging.logger.log("message", "param1", "param2");

          assert.deepStrictEqual(logLines, [["message", "param1", "param2"]]);
        });
      });

      describe("file", () => {
        it("resolves a file path to descriptor", async () => {
          const options = EthereumOptionsConfig.normalize({
            logging: { file: logfilePath }
          });
          assert.strictEqual(typeof options.logging.file, "number");
          assert.doesNotThrow(
            () => closeSync(options.logging.file),
            "File descriptor not valid"
          );
        });

        it("resolves a file path as Buffer to descriptor", async () => {
          const options = EthereumOptionsConfig.normalize({
            logging: { file: Buffer.from(logfilePath, "utf8") }
          });
          assert.strictEqual(typeof options.logging.file, "number");
          assert.doesNotThrow(
            () => closeSync(options.logging.file),
            "File descriptor not valid"
          );
        });

        it("resolves a file URL to descriptor", async () => {
          const options = EthereumOptionsConfig.normalize({
            logging: { file: new URL(`file://${logfilePath}`) }
          });
          assert.strictEqual(typeof options.logging.file, "number");
          assert.doesNotThrow(
            () => closeSync(options.logging.file),
            "File descriptor not valid"
          );
        });

        it("fails if the process doesn't have write access to the file path provided", async () => {
          await tmp.withFile(async ({ path }) => {
            const handle = await open(path, "w");
            // set no permissions on the file
            await handle.chmod(0);
            await handle.close();

            const errorMessage = `Failed to open log file ${path}. Please check if the file path is valid and if the process has write permissions to the directory.${EOL}`; // the specific error that follows this is OS dependent
            assert.throws(
              () =>
                EthereumOptionsConfig.normalize({
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

          const options = EthereumOptionsConfig.normalize({
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

          const options = EthereumOptionsConfig.normalize({
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
