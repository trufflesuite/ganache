import assert from "assert";
import { FilecoinOptionsConfig } from "../src";
import sinon from "sinon";
import { resolve } from "path";
import { promises } from "fs";
const { unlink, open, readFile } = promises;
import { closeSync } from "fs";

import { URL } from "url";
describe("FilecoinOptionsConfig", () => {
  describe("logging", () => {
    const validFilePath = resolve("./tests/test-file.log");

    describe("options", () => {
      let spy: any;
      beforeEach(() => {
        spy = sinon.spy(console, "log");
      });

      afterEach(() => {
        spy.restore();
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
            logging: { file: validFilePath }
          });
          try {
            assert(typeof options.logging.file === "number");
            assert.doesNotThrow(
              () => closeSync(options.logging.file),
              "File descriptor not valid"
            );
          } finally {
            await unlink(validFilePath);
          }
        });

        it("resolves a file path as Buffer to descriptor", async () => {
          const options = FilecoinOptionsConfig.normalize({
            logging: { file: Buffer.from(validFilePath, "utf8") }
          });
          try {
            assert(typeof options.logging.file === "number");
            assert.doesNotThrow(
              () => closeSync(options.logging.file),
              "File descriptor not valid"
            );
          } finally {
            await unlink(validFilePath);
          }
        });

        it("resolves a file URL as Buffer to descriptor", async () => {
          const options = FilecoinOptionsConfig.normalize({
            logging: { file: new URL(`file://${validFilePath}`) }
          });
          try {
            assert(typeof options.logging.file === "number");
            assert.doesNotThrow(
              () => closeSync(options.logging.file),
              "File descriptor not valid"
            );
          } finally {
            await unlink(validFilePath);
          }
        });

        it("fails if the process doesn't have write access to the file path provided", async () => {
          const file = resolve("./eperm-file.log");
          try {
            const handle = await open(file, "w");
            // set no permissions on the file
            await handle.chmod(0);
            await handle.close();

            const error = {
              message: `Failed to open log file ${file}. Please check if the file path is valid and if the process has write permissions to the directory.`
            };

            assert.throws(
              () =>
                FilecoinOptionsConfig.normalize({
                  logging: { file }
                }),
              error
            );
          } finally {
            await unlink(file);
          }
        });

        it("should append to the specified file", async () => {
          const message = "message";
          const handle = await open(validFilePath, "w");
          try {
            await handle.write("existing content");
            handle.close();

            const options = FilecoinOptionsConfig.normalize({
              logging: { file: validFilePath }
            });
            options.logging.logger.log(message);

            const readHandle = await open(validFilePath, "r");
            const content = await readHandle.readFile({ encoding: "utf8" });
            await readHandle.close();
            assert(
              content.startsWith("existing content"),
              "Existing content was overwritten by the logger"
            );
          } finally {
            await unlink(validFilePath);
          }
        });

        it("uses the provided logger, and file when both `logger` and `file` are provided", async () => {
          const calls: any[] = [];
          const logger = {
            log: (message: any, ...params: any[]) => {
              calls.push([message, ...params]);
            }
          };

          try {
            const options = FilecoinOptionsConfig.normalize({
              logging: {
                logger,
                file: validFilePath
              }
            });

            options.logging.logger.log("message", "param1", "param2");
            await options.logging.logger.close();

            assert.deepStrictEqual(calls, [["message", "param1", "param2"]]);

            const fromFile = await readFile(validFilePath, "utf8");
            assert(fromFile !== "", "Nothing written to the log file");

            const timestampPart = fromFile.substring(0, 24);

            const timestampRegex =
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
            assert(
              timestampPart.match(timestampRegex),
              `Unexpected timestamp from file ${timestampPart}`
            );

            const messagePart = fromFile.substring(25);

            assert.strictEqual(messagePart, "message param1 param2\n");
          } finally {
            await unlink(validFilePath);
          }
        });
      });
    });
  });
});
