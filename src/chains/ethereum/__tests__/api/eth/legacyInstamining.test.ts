
import getProvider from "../../helpers/getProvider";
import assert from "assert";
import EthereumProvider from "../../../src/provider";

describe("api", () => {
  describe("eth", () => {
    describe("legacyInstamining", () => {
      it("when not in legacy mode, does not mine before returning the tx hash", async () => {
        const provider = await getProvider({legacyInstamine: false});
        const accounts = await provider.send("eth_accounts");

        const hash = await provider.send("eth_sendTransaction", [
          {
            from: accounts[0],
            to: accounts[1],
            value: 1
          }
        ]);
        const receipt = await provider.send("eth_getTransactionReceipt", [hash]);
        assert.strictEqual(receipt, null);
      });

      it("when in legacy mode, mines before returns in the tx hash", async () => {
        const provider = await getProvider({legacyInstamine: true});
        const accounts = await provider.send("eth_accounts");

        const hash = await provider.send("eth_sendTransaction", [
          {
            from: accounts[0],
            to: accounts[1],
            value: 1
          }
        ]);
        const receipt = await provider.send("eth_getTransactionReceipt", [hash]);
        assert.notStrictEqual(receipt, null);
      });
    });
  });
});
