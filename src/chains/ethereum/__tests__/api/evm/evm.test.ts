import getProvider from "../../helpers/getProvider";
import assert from "assert";

function between(x: number, min: number, max: number) {
  return x >= min && x <= max;
}

describe("api", () => {
  describe("evm", () => {
    describe("evm_setTime", () => {
      it("should set the time correctly when difference is greater than 2**31", async () => {
        // this test is here to prevent a dev from "optimizing" rounding to use
        // bitwise tricks since those won't work on numbers greater than 2**31.

        const provider = await getProvider();
        // Multiple by 1000 because ganache keeps track of time in seconds
        const bin32 = (2**31) * 1000;
        const now = Date.now();
        // fast forward time by bin32, plus 2 seconds, in case testing is slow
        const newTime = bin32 + now + 2;

        const timeAdjustment = await provider.send("evm_setTime", [newTime]);
        
        // it should return `newTime - now`, floored to the nearest second
        const baseLineOffset = Math.floor((newTime - now) / 1000);
        assert(between(timeAdjustment, baseLineOffset - 2, baseLineOffset + 2));
      });
    });

    describe("evm_increaseTime", () => {
      it("should return the `timeAdjustment` value via `evm_increaseTime`", async () => {
        const provider = await getProvider();
        const seconds = 10;
        const timeAdjustment = await provider.send("evm_increaseTime", [seconds]);
        assert.strictEqual(timeAdjustment, seconds);
      });
    });

    describe("miner_stop/eth_mining/miner_start", () => {
      async function testStopStartMining(provider) {
        const initialBlockNumber = parseInt(await provider.send("eth_blockNumber"));
        const [account] = await provider.send("eth_accounts");

        // stop the miner
        const stopped = await provider.send("miner_stop");
        assert.strictEqual(stopped, true);

        // check that eth_mining returns the correct status
        let miningStatus = await provider.send("eth_mining");
        assert.strictEqual(miningStatus, false);

        // send a transaction, and make sure it does *not* get mined
        await provider.send("eth_subscribe", ["newHeads"]);
        const txHash = await provider.send("eth_sendTransaction", [{from: account, to: account, value: 1}]);
        const fail = () => assert.fail("No message should have been received while mining was stopped");
        provider.on("message", fail);
        await new Promise(resolve => setTimeout(resolve, 2000));
        provider.off("message", fail);

        // let's relaly make sure it wasn't mined by checking for a receipt
        let receipt = await provider.send("eth_getTransactionReceipt", [txHash]);
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
        assert.strictEqual(parseInt(receipt.blockNumber), initialBlockNumber + 1);
      }

      it("should stop mining, then mine when started", async () => {
        const provider = await getProvider();
        await testStopStartMining(provider);
      }).timeout(3000);

      it("should stop mining, then mine when started", async () => {
        const provider = await getProvider({blockTime: 1});
        await testStopStartMining(provider);
      }).timeout(4000);
    });

    describe("evm_mine", () => {
      it("should mine a block on demand", async () => {
        const provider = await getProvider();
        const initialBlock = parseInt(await provider.send("eth_blockNumber"));
        await provider.send("evm_mine");
        const currentBlock = parseInt(await provider.send("eth_blockNumber"));
        assert.strictEqual(currentBlock, initialBlock + 1);
      });

      it("should mine a block on demand at the specified timestamp", async () => {
        const startDate = new Date(2019, 3, 15);
        const miningTimestamp = Math.floor((new Date(2020, 3, 15).getTime() / 1000));
        const provider = await getProvider({time: startDate});
        await provider.send("evm_mine", [miningTimestamp]);
        const currentBlock = await provider.send("eth_getBlockByNumber", ["latest"]);
        assert.strictEqual(parseInt(currentBlock.timestamp), miningTimestamp);
      });

      it("should mine a block even when mining is stopped", async () => {
        const provider = await getProvider();
        const initialBlock = parseInt(await provider.send("eth_blockNumber"));
        await provider.send("miner_stop");
        await provider.send("evm_mine");
        const currentBlock = parseInt(await provider.send("eth_blockNumber"));
        assert.strictEqual(currentBlock, initialBlock + 1);
      });

      it("should mine a block when in interval mode", async () => {
        const provider = await getProvider({blockTime: 1000});
        const initialBlock = parseInt(await provider.send("eth_blockNumber"));
        await provider.send("evm_mine");
        const currentBlock = parseInt(await provider.send("eth_blockNumber"));
        assert.strictEqual(currentBlock, initialBlock + 1);
      });

      it("should mine a block when in interval mode even when mining is stopped", async () => {
        const provider = await getProvider({blockTime: 1000});
        const initialBlock = parseInt(await provider.send("eth_blockNumber"));
        await provider.send("miner_stop");
        await provider.send("evm_mine");
        const currentBlock = parseInt(await provider.send("eth_blockNumber"));
        assert.strictEqual(currentBlock, initialBlock + 1);
      });
    });
  });
});
