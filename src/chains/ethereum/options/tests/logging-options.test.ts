import assert from "assert";
import { EthereumOptionsConfig } from "../src";
import sinon from "sinon";
import { resolve } from "path";

describe("EthereumOptionsConfig", () => {
  describe("logging", () => {
    // resolve absolute path of current working directory, which is clearly an
    // invalid file path (because it's a directory).
    const invalidFilePath = resolve("");

    describe("options", () => {
      let spy: any;
      beforeEach(() => {
        spy = sinon.spy(console, "log");
      });

      afterEach(() => {
        spy.restore();
      });

      it("logs via console.log by default", () => {
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

      it("fails if an invalid file path is provided", () => {
        const message = `Failed to write logs to ${invalidFilePath}. Please check if the file path is valid and if the process has write permissions to the directory.`;

        assert.throws(() => {
          EthereumOptionsConfig.normalize({
            logging: { file: invalidFilePath }
          });
        }, new Error(message));
      });
    });
  });
});
