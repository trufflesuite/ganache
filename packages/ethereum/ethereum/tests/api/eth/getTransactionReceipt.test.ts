import getProvider, { mnemonic } from "../../helpers/getProvider";
import assert from "assert";
import { EthereumProvider } from "../../../src/provider";

describe("api", () => {
  describe("eth", () => {
    describe("getTransactionReceipt", () => {
      let provider: EthereumProvider;
      let logger, from;

      beforeEach(async () => {
        // create a logger to test output
        logger = {
          clearLoggedStuff: function () {
            this.loggedStuff = "";
          },
          loggedStuff: "",
          log: function (message) {
            if (message) {
              this.loggedStuff += message;
            }
          }
        };
        provider = await getProvider({
          logging: { logger },
          wallet: { mnemonic }
        });
        [from] = await provider.send("eth_accounts");
      });

      afterEach(() => {
        logger.clearLoggedStuff();
      });

      it("returns the receipt for the transaction", async () => {
        await provider.send("eth_subscribe", ["newHeads"]);

        const hash = await provider.send("eth_sendTransaction", [
          { from, to: from }
        ]);

        // wait for the tx to be mined
        await provider.once("message");
        const receipt = await provider.send("eth_getTransactionReceipt", [
          hash
        ]);
        assert(receipt);
        assert(
          !logger.loggedStuff.includes(
            "Ganache `eth_getTransactionReceipt` notice"
          )
        );
      });

      it("returns null if the transaction does not exist", async () => {
        const result = await provider.send("eth_getTransactionReceipt", [
          "0x0"
        ]);
        assert.strictEqual(result, null);
        assert(
          !logger.loggedStuff.includes(
            "Ganache `eth_getTransactionReceipt` notice"
          )
        );
      });

      describe("strict instamine detection and notice", () => {
        it("logs a warning if the transaction hasn't been mined yet", async () => {
          const strictInstamineProvider = await getProvider({
            logging: { logger },
            miner: { instamine: "strict" },
            wallet: { mnemonic }
          });
          const hash = await strictInstamineProvider.send(
            "eth_sendTransaction",
            [{ from, to: from }]
          );

          // do not wait for the tx to be mined which will create a warning
          const result = await strictInstamineProvider.send(
            "eth_getTransactionReceipt",
            [hash]
          );

          assert.strictEqual(result, null);
          assert(
            logger.loggedStuff.includes(
              " > Ganache `eth_getTransactionReceipt` notice: the transaction with hash\n" +
                ` > \`${hash}\` has not\n` +
                " > yet been mined." +
                " See https://trfl.io/v7-instamine for additional information."
            ),
            `Actual: ${logger.loggedStuff}`
          );
        });

        it("doesn't log when instamine is not enabled", async () => {
          const nonInstamineProvider = await getProvider({
            logging: { logger },
            miner: { blockTime: 1 }
          });
          const [from] = await nonInstamineProvider.send("eth_accounts");

          const hash = await nonInstamineProvider.send("eth_sendTransaction", [
            { from, to: from }
          ]);

          const result = await nonInstamineProvider.send(
            "eth_getTransactionReceipt",
            [hash]
          );

          assert.strictEqual(result, null);
          assert(
            !logger.loggedStuff.includes(
              "Ganache `eth_getTransactionReceipt` notice"
            )
          );
        });

        it("doesn't log when the chain is stopped", async () => {
          await provider.send("miner_stop", []);
          const hash = await provider.send("eth_sendTransaction", [
            { from, to: from }
          ]);

          const result = await provider.send("eth_getTransactionReceipt", [
            hash
          ]);

          assert.strictEqual(result, null);
          assert(
            !logger.loggedStuff.includes(
              "Ganache `eth_getTransactionReceipt` notice"
            )
          );
        });

        it("doesn't log if instamine is set to 'eager' (default)", async () => {
          const eagerInstamineProvider = await getProvider({
            logging: { logger },
            miner: { instamine: "eager" }
          });

          const [from] = await eagerInstamineProvider.send("eth_accounts");

          const hash = await eagerInstamineProvider.send(
            "eth_sendTransaction",
            [{ from, to: from }]
          );

          const result = await eagerInstamineProvider.send(
            "eth_getTransactionReceipt",
            [hash]
          );

          // the tx is mined before sending the tx hash back to the user
          // if instamine is set to 'eager' - so they will get a receipt
          assert(result);
          assert(
            !logger.loggedStuff.includes(
              "Ganache `eth_getTransactionReceipt` notice"
            )
          );
        });
      });
    });
  });
});
