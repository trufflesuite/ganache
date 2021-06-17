import assert from "assert";
import EthereumProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";

describe("api", () => {
  describe("miner", () => {
    describe("miner_stop/eth_mining/miner_start", () => {
      async function testStopStartMining(provider) {
        const initialBlockNumber = parseInt(
          await provider.send("eth_blockNumber")
        );
        const [account] = await provider.send("eth_accounts");

        // stop the miner
        const stopped = await provider.send("miner_stop");
        assert.strictEqual(stopped, true);

        // check that eth_mining returns the correct status
        let miningStatus = await provider.send("eth_mining");
        assert.strictEqual(miningStatus, false);

        // send a transaction, and make sure it does *not* get mined
        await provider.send("eth_subscribe", ["newHeads"]);
        const txHash = await provider.send("eth_sendTransaction", [
          { from: account, to: account, value: 1 }
        ]);
        const fail = () =>
          assert.fail(
            "No message should have been received while mining was stopped"
          );
        provider.on("message", fail);
        await new Promise(resolve => setTimeout(resolve, 2000));
        provider.off("message", fail);

        // let's relaly make sure it wasn't mined by checking for a receipt
        let receipt = await provider.send("eth_getTransactionReceipt", [
          txHash
        ]);
        assert.strictEqual(receipt, null);

        // now start the miner back up
        const prom = provider.once("message");
        const started = await provider.send("miner_start");
        assert.strictEqual(started, true);

        // check that eth_mining returns the correct status
        miningStatus = await provider.send("eth_mining");
        assert.strictEqual(miningStatus, true);

        // wait for the transaction to be mined
        await prom;
        receipt = await provider.send("eth_getTransactionReceipt", [txHash]);

        // make sure we're on the next block!
        assert.strictEqual(
          parseInt(receipt.blockNumber),
          initialBlockNumber + 1
        );
      }

      it("should stop mining, then mine when started", async () => {
        const provider = await getProvider();
        await testStopStartMining(provider);
      }).timeout(3000);

      it("should stop mining, then mine when started", async () => {
        const provider = await getProvider({ miner: { blockTime: 1 } });
        await testStopStartMining(provider);
      }).timeout(4000);
    });

    describe("miner_setEtherbase", () => {
      let provider: EthereumProvider;
      let accounts: string[];

      beforeEach(async () => {
        provider = await getProvider();
        accounts = await provider.send("eth_accounts");
      });

      it("sets the etherbase", async () => {
        const setState = await provider.send("miner_setEtherbase", [
          accounts[1]
        ]);
        assert.strictEqual(setState, true);

        const coinbase = await provider.send("eth_coinbase");
        assert.strictEqual(coinbase, accounts[1]);

        await provider.send("eth_subscribe", ["newHeads"]);
        const txHash = await provider.send("eth_sendTransaction", [
          { from: accounts[0], to: accounts[0] }
        ]);
        await provider.once("message");
        const {
          status,
          blockNumber
        } = await provider.send("eth_getTransactionReceipt", [txHash]);
        assert.strictEqual(status, "0x1");
        const { miner } = await provider.send("eth_getBlockByNumber", [
          blockNumber
        ]);
        assert.strictEqual(miner, accounts[1]);
      });
    });

    describe("miner_setDefaultGasPrice", () => {
      let provider: EthereumProvider;
      let accounts: string[];

      beforeEach(async () => {
        provider = await getProvider();
        accounts = await provider.send("eth_accounts");
      });

      it("sets the defaultGasPrice and uses it as the default price in tranactions", async () => {
        const newDefaultGasPrice = "0xffff";
        const setState = await provider.send("miner_setDefaultGasPrice", [
          newDefaultGasPrice
        ]);
        assert.strictEqual(setState, true);

        const ethDefaultGasPrice = await provider.send("eth_defaultGasPrice");
        assert.strictEqual(ethDefaultGasPrice, newDefaultGasPrice);

        await provider.send("eth_subscribe", ["newHeads"]);
        const txHash = await provider.send("eth_sendTransaction", [
          { from: accounts[0], to: accounts[0] }
        ]);
        await provider.once("message");

        const { gasPrice } = await provider.send("eth_getTransactionByHash", [
          txHash
        ]);
        assert.strictEqual(gasPrice, newDefaultGasPrice);
      });
    });
  });
});
