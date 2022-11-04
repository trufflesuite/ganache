import assert from "assert";
import {
  EthereumDefaults,
  EthereumOptionsConfig,
  KNOWN_NETWORKS
} from "../src";
import sinon from "sinon";

describe("EthereumOptionsConfig", () => {
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
  });
  describe(".normalize", () => {
    it("returns an options object with all default namespaces", () => {
      const options = EthereumOptionsConfig.normalize({});
      for (const namespace in EthereumDefaults) {
        assert(options[namespace]);
      }
    });
    it("uses input values when supplied instead of defaults", () => {
      const options = EthereumOptionsConfig.normalize({
        wallet: { totalAccounts: 7 }
      });
      assert.strictEqual(options.wallet.totalAccounts, 7);
    });
    it("throws an error when an option conflict is found", () => {
      assert.throws(() => {
        EthereumOptionsConfig.normalize({
          wallet: {
            deterministic: true,
            seed: "there I oft spent narrow nightwatch nigh the ship's head"
          }
        } as Object);
      });
    });

    describe("legacy input formats", () => {
      it("accepts some legacy input formats", () => {
        const seed = "from their voids, cry to the dolphined sea";
        const options = EthereumOptionsConfig.normalize({ seed } as Object);
        assert.strictEqual(options.wallet.seed, seed);
      });
      it("errors if there is a conflict with legacy inputs", () => {
        const seed = "I ate three cookies";
        const mnemonic = "fee fi fo fum";
        assert.throws(() => {
          const options = EthereumOptionsConfig.normalize({
            seed,
            mnemonic
          } as Object);
        });
      });
      it("errors if there is a conflict with legacy and modern inputs", () => {
        const seed = "I ate three cookies";
        const mnemonic = "fee fi fo fum";
        assert.throws(() => {
          const options = EthereumOptionsConfig.normalize({
            seed,
            wallet: { mnemonic }
          } as Object);
        });
      });
    });

    describe("hardfork", () => {
      // array of all networks except mainnet
      const testData = KNOWN_NETWORKS.filter(n => n !== "mainnet");
      beforeEach(() => {
        //reset process arguments
        process.argv = [];
      });
      it("defaults to `grayGlacier` when network option is not provided", () => {
        const options = EthereumOptionsConfig.normalize({} as Object);
        assert.strictEqual(options.chain.hardfork, "grayGlacier");
      });
      it("defaults to `grayGlacier` when network option is blank", () => {
        process.argv.push("--fork");
        const options = EthereumOptionsConfig.normalize({} as Object);
        assert.strictEqual(options.chain.hardfork, "grayGlacier");
      });
      it("defaults to `grayGlacier` when network is `mainnet`", () => {
        process.argv.push("--fork", "mainnet");
        const options = EthereumOptionsConfig.normalize({} as Object);
        assert.strictEqual(options.chain.hardfork, "grayGlacier");
      });
      testData.forEach(network => {
        it(`defaults to london when network is ${network}`, () => {
          process.argv.push("--fork", network);
          const options = EthereumOptionsConfig.normalize({} as Object);
          assert.strictEqual(options.chain.hardfork, "london");
        });
      });
      it("overrides default `grayGlacier` value to hardfork provided when network is `mainnet`", () => {
        process.argv.push("--fork", "mainnet");
        const options = EthereumOptionsConfig.normalize({
          hardfork: "berlin"
        } as Object);
        assert.strictEqual(options.chain.hardfork, "berlin");
      });
    });
  });
});
