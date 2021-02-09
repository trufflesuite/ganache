import getProvider from "../../helpers/getProvider";
import assert from "assert";
import EthereumProvider from "../../../src/provider";

describe("api", () => {
  describe("eth", () => {
    describe("getTransactionReceipt", () => {
      let provider: EthereumProvider;
      let logger;

      beforeEach(async () => {
        // create a logger to test output
        logger = {
          clearLoggedStuff: function () {
            this.loggedStuff = "";
          },
          loggedStuff: "",
          log: function (message) {
            if (message) {
              this.loggedStuff = this.loggedStuff.concat(message);
            }
          }
        };
        provider = await getProvider({ logging: { logger } });
      });

      it("returns the receipt for the transaction", async () => {
        const [from] = await provider.send("eth_accounts");
        await provider.send("eth_subscribe", ["newHeads"]);

        const hash = await provider.send("eth_sendTransaction", [
          {
            from,
            to: from
          }
        ]);

        // wait for the tx to be mined
        await provider.once("message");
        const receipt = await provider.send("eth_getTransactionReceipt", [
          hash
        ]);
        assert(receipt);
      });

      it("returns null if the transaction does not exist", async () => {
        const result = await provider.send("eth_getTransactionReceipt", [
          "0x0"
        ]);
        assert.strictEqual(result, null);
      });

      it("logs a warning if the transaction hasn't been mined yet", async () => {
        logger.clearLoggedStuff();
        const [from] = await provider.send("eth_accounts");

        const hash = await provider.send("eth_sendTransaction", [
          {
            from,
            to: from
          }
        ]);

        // do not wait for the tx to be mined which will create a warning
        await provider.send("eth_getTransactionReceipt", [hash]);
        assert(
          logger.loggedStuff.includes(
            "Ganache `eth_getTransactionReceipt` warning"
          )
        );
      });
    });
  });
});
