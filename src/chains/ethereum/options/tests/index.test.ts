import assert from "assert";
import { ethereumDefaults, EthereumOptionsConfig } from "../src";

describe("EthereumOptionsConfig", () => {
  describe(".normalize", () => {
    it("returns an options object with default namespaces", () => {
      const options = EthereumOptionsConfig.normalize({});
      for (const namespace in ethereumDefaults) {
        assert(options[namespace]);
      }
    });
    it("uses input values when supplied instead of defaults", () => {
      const options = EthereumOptionsConfig.normalize({
        wallet: { totalAccounts: 7 }
      });
      assert.equal(options.wallet.totalAccounts, 7);
    });
    describe("option conflicts", () => {
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
    });
  });
});
