import assert from "assert";
import { EthereumOptionsConfig } from "../src";
import sinon from "sinon";
import { resolve } from "path";
import { promises } from "fs";
const unlink = promises.unlink;
import { closeSync, openSync } from "fs";
import { URL } from "url";

describe("EthereumOptionsConfig", () => {
  describe("logging", () => {
    // resolve absolute path of current working directory, which is clearly an
    // invalid file path (because it's a directory).
    const invalidFilePath = resolve("");
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
      });

      describe("file", () => {
        it("resolves a file path to descriptor", async () => {
          const options = EthereumOptionsConfig.normalize({
            logging: { file: validFilePath }
          });
          try {
            assert(typeof options.logging.file === "number");
            assert.doesNotThrow(() =>
              closeSync(options.logging.file as number)
            );
          } finally {
            await unlink(validFilePath);
          }
        });

        it("resolves a file path as Buffer to descriptor", async () => {
          const options = EthereumOptionsConfig.normalize({
            logging: { file: Buffer.from(validFilePath, "utf8") }
          });
          try {
            assert(typeof options.logging.file === "number");
            assert.doesNotThrow(() =>
              closeSync(options.logging.file as number)
            );
          } finally {
            await unlink(validFilePath);
          }
        });

        it("resolves a file URL as Buffer to descriptor", async () => {
          const options = EthereumOptionsConfig.normalize({
            logging: { file: new URL(`file://${validFilePath}`) }
          });
          try {
            assert(typeof options.logging.file === "number");
            assert.doesNotThrow(() =>
              closeSync(options.logging.file as number)
            );
          } finally {
            await unlink(validFilePath);
          }
        });

        it("uses an existing descriptor if passed in", async () => {
          const fd = openSync(validFilePath, "a");

          const options = EthereumOptionsConfig.normalize({
            logging: { file: fd }
          });

          try {
            assert.strictEqual(options.logging.file, fd);
            assert(typeof options.logging.file === "number");
            assert.doesNotThrow(() =>
              closeSync(options.logging.file as number)
            );
          } finally {
            await unlink(validFilePath);
          }
        });

        it("fails if an invalid file path is provided", () => {
          const message = `Failed to open log file ${invalidFilePath}. Please check if the file path is valid and if the process has write permissions to the directory.`;

          assert.throws(
            () => {
              EthereumOptionsConfig.normalize({
                logging: { file: invalidFilePath }
              });
            },
            { message }
          );
        });

        it("fails if both `logger` and `file` is provided", async () => {
          // this needs to be of type any, because it's an invalid config (both logger and file specified)
          const config = {
            logging: {
              logger: { log: (message, ...params) => {} },
              file: 1
            }
          } as any;

          assert.throws(() => EthereumOptionsConfig.normalize(config), {
            message: `Values for both "logging.logger" and "logging.file" cannot be specified; they are mutually exclusive.`
          });
        });
      });
    });
  });
});
