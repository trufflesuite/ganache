import assert from "assert";
import EthereumProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";

function hex(length: number) {
  return `0x${Buffer.allocUnsafe(length).fill(0).toString("hex")}`;
}

describe("api", () => {
  describe("eth", () => {
    let provider: EthereumProvider;
    let accounts: string[];

    beforeEach(async () => {
      provider = await getProvider();

      accounts = await provider.send("eth_accounts");
    });

    describe("eth_coinbase", () => {
      it("should return correct address", async () => {
        const coinbase = await provider.send("eth_coinbase");
        assert.strictEqual(coinbase, "0x" + "0".repeat(40));
      });
    });

    describe("eth_mining", () => {
      it("should return true", async () => {
        const result = await provider.send("eth_mining");
        assert.strictEqual(result, true);
      });
    });

    describe("eth_syncing", () => {
      it("should return true", async () => {
        const result = await provider.send("eth_syncing");
        assert.strictEqual(result, false);
      });
    });

    describe("eth_hashrate", () => {
      it("should return hashrate of zero", async () => {
        const result = await provider.send("eth_hashrate");
        assert.deepStrictEqual(result, "0x0");
      });
    });

    describe("eth_protocolVersion", () => {
      it("should get ethereum version", async () => {
        const result = await provider.send("eth_protocolVersion");
        assert.strictEqual(result, "0x3f", "Network Version should be 63");
      });
    });

    describe("eth_getCompilers", () => {
      it("should get compilers list", async () => {
        const result = await provider.send("eth_getCompilers");
        assert.deepStrictEqual(result, []);
      });
    });

    describe("eth_submitWork", () => {
      it("should get compilers list", async () => {
        const result = await provider.send("eth_submitWork", [
          hex(8),
          hex(32),
          hex(32)
        ]);
        assert.deepStrictEqual(result, false);
      });
    });

    describe("eth_getWork", () => {
      it("should get compilers list", async () => {
        const result = await provider.send("eth_getWork", ["0x0"]);
        assert.deepStrictEqual(result, []);
      });
    });

    describe("eth_submitHashrate", () => {
      it("should return the status of eth_submitHashrate", async () => {
        const result = await provider.send("eth_submitHashrate", [
          hex(32),
          hex(32)
        ]);
        assert.deepStrictEqual(result, false);
      });
    });

    describe("eth_chainId", () => {
      it("should return the default chain id", async () => {
        const result = await provider.send("eth_chainId");
        assert.deepStrictEqual(result, "0x539");
      });

      it("should use the default chain id when signing transactions", async () => {
        await provider.send("eth_subscribe", ["newHeads"]);
        const txHash = await provider.send("eth_sendTransaction", [
          { from: accounts[0], to: accounts[0] }
        ]);
        await provider.once("message");
        const tx = await provider.send("eth_getTransactionByHash", [txHash]);
        assert.strictEqual(tx.v, "0xa95");
      });

      it("chainId option should change the chain id", async () => {
        const provider = await getProvider({ chain: { chainId: 1234 } });
        const result = await provider.send("eth_chainId");
        assert.deepStrictEqual(result, "0x4d2");
      });
    });

    describe("eth_getBalance", () => {
      it("should return initial balance", async () => {
        const balance = await provider.send("eth_getBalance", [accounts[0]]);
        assert.strictEqual(balance, "0x3635c9adc5dea00000");
      });

      it("should return 0 for non-existent account", async () => {
        const balance = await provider.send("eth_getBalance", [
          "0x1234567890123456789012345678901234567890"
        ]);
        assert.strictEqual(balance, "0x0");
      });
    });

    describe("eth_getTransactionCount", () => {
      it("should get the transaction count of the block", async () => {
        const tx = {
          from: accounts[0],
          to: accounts[1],
          value: "0x1"
        };

        const txCount1 = await provider.send("eth_getTransactionCount", [
          accounts[0]
        ]);
        assert.strictEqual(txCount1, "0x0");
        const initialBlockNumber = await provider.send("eth_blockNumber");
        const txCount2 = await provider.send("eth_getTransactionCount", [
          accounts[0],
          initialBlockNumber
        ]);
        assert.strictEqual(txCount2, "0x0");

        await provider.send("eth_subscribe", ["newHeads"]);

        // send one tx, then check the count
        await provider.send("miner_stop");
        await provider.send("eth_sendTransaction", [{ ...tx }]);
        await provider.send("miner_start");
        const message1 = await provider.once("message");

        const txCount3 = await provider.send("eth_getTransactionCount", [
          accounts[0],
          message1.data.result.number
        ]);
        assert.strictEqual(txCount3, "0x1");

        // send two txs, then check the count
        await provider.send("miner_stop");
        await provider.send("eth_sendTransaction", [{ ...tx }]);
        await provider.send("eth_sendTransaction", [{ ...tx }]);
        await provider.send("miner_start");
        const message2 = await provider.once("message");

        const txCount4 = await provider.send("eth_getTransactionCount", [
          accounts[0],
          message2.data.result.number
        ]);
        assert.strictEqual(txCount4, "0x3");

        // the check the count at different block numbers...

        const txCount5 = await provider.send("eth_getTransactionCount", [
          accounts[0],
          message1.data.result.number
        ]);
        assert.strictEqual(txCount5, txCount3);

        const txCount6 = await provider.send("eth_getTransactionCount", [
          accounts[0],
          initialBlockNumber
        ]);
        assert.strictEqual(txCount6, "0x0");

        const txCount7 = await provider.send("eth_getTransactionCount", [
          accounts[0]
        ]);
        assert.strictEqual(txCount7, txCount4);

        const txCount8 = await provider.send("eth_getTransactionCount", [
          accounts[0],
          "earliest"
        ]);
        assert.strictEqual(txCount8, "0x0");

        const txCount9 = await provider.send("eth_getTransactionCount", [
          accounts[0],
          "latest"
        ]);
        assert.strictEqual(txCount9, txCount4);
      });
    });

    describe("eth_blockNumber", () => {
      it("should return initial block number of zero", async () => {
        const blockNumber = await provider.send("eth_blockNumber");
        assert.strictEqual(parseInt(blockNumber, 10), 0);
      });

      it("should increment the block number after a transaction", async () => {
        const tx = {
          from: accounts[0],
          to: accounts[1],
          value: "0x1"
        };

        const startingBlockNumber = parseInt(
          await provider.send("eth_blockNumber")
        );
        await provider.send("eth_subscribe", ["newHeads"]);
        await provider.send("eth_sendTransaction", [{ ...tx }]);
        await provider.once("message");
        const block1 = await provider.send("eth_blockNumber");
        assert.strictEqual(
          +block1,
          startingBlockNumber + 1,
          "first transaction's block number not as expected"
        );

        const awaitFor = count =>
          new Promise(resolve => {
            let counter = 0;
            const off = provider.on("message", (_block: any) => {
              counter++;
              if (counter === count) {
                off();
                resolve(void 0);
              }
            });
          });

        let wait = awaitFor(4);
        await Promise.all([
          provider.send("eth_sendTransaction", [{ ...tx }]),
          provider.send("eth_sendTransaction", [{ ...tx }]),
          provider.send("eth_sendTransaction", [{ ...tx }]),
          provider.send("eth_sendTransaction", [{ ...tx }])
        ]);

        await Promise.all([
          provider.send("eth_sendTransaction", [{ ...tx }]),
          provider.send("eth_sendTransaction", [{ ...tx }]),
          provider.send("eth_sendTransaction", [{ ...tx }]),
          provider.send("eth_sendTransaction", [{ ...tx }])
        ]);
        await wait;
        wait = awaitFor(4);
        const block5 = await provider.send("eth_blockNumber");
        assert.strictEqual(
          +block5,
          startingBlockNumber + 5,
          "second block's number not as expected"
        );
        await wait;
        const block9 = await provider.send("eth_blockNumber");
        assert.strictEqual(
          +block9,
          startingBlockNumber + 9,
          "third block's number not as expected"
        );
      });
    });

    it("eth_getBlockByNumber", async () => {
      const _subscriptionId = await provider.send("eth_subscribe", [
        "newHeads"
      ]);
      await provider.send("eth_sendTransaction", [
        {
          from: accounts[0],
          to: accounts[1],
          value: "0x1"
        }
      ]);
      const _message = await provider.once("message");
      const blocks = await Promise.all([
        provider.send("eth_getBlockByNumber", ["0x1", true]),
        provider.send("eth_getBlockByNumber", ["0x1"])
      ]);
      assert(blocks[0].hash, blocks[1].hash);
    });

    it("eth_getBlockByHash", async () => {
      const _subscriptionId = await provider.send("eth_subscribe", [
        "newHeads"
      ]);
      await provider.send("eth_sendTransaction", [
        {
          from: accounts[0],
          to: accounts[1],
          value: "0x1"
        }
      ]);
      const _message = await provider.once("message");
      const block = await provider.send("eth_getBlockByNumber", ["0x1"]);

      const blocks = await Promise.all([
        provider.send("eth_getBlockByHash", [block.hash, true]),
        provider.send("eth_getBlockByHash", [block.hash])
      ]);
      assert(blocks[0].hash, blocks[1].hash);
      const counts = await Promise.all([
        provider.send("eth_getBlockTransactionCountByNumber", ["0x1"]),
        provider.send("eth_getBlockTransactionCountByHash", [blocks[0].hash])
      ]);

      assert(true);
    });

    it("eth_getBlockTransactionCountByHash", async () => {
      const _subscriptionId = await provider.send("eth_subscribe", [
        "newHeads"
      ]);
      await provider.send("eth_sendTransaction", [
        {
          from: accounts[0],
          to: accounts[1],
          value: "0x1"
        }
      ]);
      const _message = await provider.once("message");
      const block = await provider.send("eth_getBlockByNumber", ["0x1"]);

      const count = await provider.send("eth_getBlockTransactionCountByHash", [
        block.hash
      ]);
      assert(count, "1");
    });

    it("eth_getBlockTransactionCountByNumber", async () => {
      await provider.send("eth_subscribe", ["newHeads"]);
      await provider.send("eth_sendTransaction", [
        {
          from: accounts[0],
          to: accounts[1],
          value: "0x1"
        }
      ]);
      await provider.once("message");

      const count = await provider.send(
        "eth_getBlockTransactionCountByNumber",
        ["0x1"]
      );
      assert.strictEqual(count, "0x1");
    });

    it("eth_sendTransaction bad data (tiny gas limit)", async () => {
      await provider
        .send("eth_sendTransaction", [
          {
            from: accounts[0],
            to: accounts[1],
            gas: "0x01"
          }
        ])
        .catch(e => {
          assert.strictEqual(e.code, -32000);
          assert.strictEqual(e.message, "intrinsic gas too low");
        });
    });

    it("eth_sendTransaction bad data (huge gas limit)", async () => {
      await provider
        .send("eth_sendTransaction", [
          {
            from: accounts[0],
            to: accounts[1],
            gas: "0xfffffffff"
          }
        ])
        .catch(e => {
          assert.strictEqual(e.code, -32000);
          assert.strictEqual(e.message, "exceeds block gas limit");
        });
    });

    it("handles block gas limit errors, callback style", done => {
      provider.send(
        {
          jsonrpc: "2.0",
          id: "1",
          method: "eth_sendTransaction",
          params: [
            {
              from: accounts[0],
              to: accounts[1],
              gas: "0xfffffffff" // generates an "exceeds block gas limit" error
            }
          ]
        },
        (e, r) => {
          assert.strictEqual(e.message, "exceeds block gas limit");
          assert.strictEqual((r as any).error.code, -32000);
          assert.strictEqual((r as any).error.message, e.message);
          done();
        }
      );
    });

    it("eth_getTransactionByBlockNumberAndIndex", async () => {
      await provider.send("eth_subscribe", ["newHeads"]);
      const txHash = await provider.send("eth_sendTransaction", [
        {
          from: accounts[0],
          to: accounts[1],
          value: "0x1"
        }
      ]);
      await provider.once("message");

      const tx = await provider.send(
        "eth_getTransactionByBlockNumberAndIndex",
        ["0x1", "0x0"]
      );
      assert.strictEqual(
        tx.hash,
        "0xab338178ffd130f1b7724a687ef20afcc75d44020184f82127ab1bc59f17d7e2",
        "Unexpected transaction hash."
      );
      assert.strictEqual(
        tx.hash,
        txHash,
        "eth_getTransactionByBlockNumberAndIndex transaction hash doesn't match tx hash"
      );
    });

    it("eth_getTransactionByBlockHashAndIndex", async () => {
      await provider.send("eth_subscribe", ["newHeads"]);
      const txHash = await provider.send("eth_sendTransaction", [
        {
          from: accounts[0],
          to: accounts[1],
          value: "0x1"
        }
      ]);
      const _message = await provider.once("message");
      const block = await provider.send("eth_getBlockByNumber", ["0x1"]);

      const tx = await provider.send("eth_getTransactionByBlockHashAndIndex", [
        block.hash,
        "0x0"
      ]);
      assert.strictEqual(
        tx.hash,
        "0xab338178ffd130f1b7724a687ef20afcc75d44020184f82127ab1bc59f17d7e2",
        "Unexpected transaction hash."
      );
      assert.strictEqual(
        tx.hash,
        txHash,
        "eth_getTransactionByBlockNumberAndIndex transaction hash doesn't match tx hash"
      );
    });

    it("eth_getTransactionReceipt", async () => {
      await provider.send("eth_subscribe", ["newHeads"]);
      const hash = await provider.send("eth_sendTransaction", [
        {
          from: accounts[0],
          to: accounts[1],
          value: "0x1"
        }
      ]);
      const _message = await provider.once("message");

      const receipt = await provider.send("eth_getTransactionReceipt", [hash]);
      assert(receipt.transactionIndex, "0x0");
    });

    it("eth_getTransactionByHash", async () => {
      await provider.send("eth_subscribe", ["newHeads"]);
      const hash = await provider.send("eth_sendTransaction", [
        {
          from: accounts[0],
          to: accounts[1],
          value: "0x1"
        }
      ]);
      const _message = await provider.once("message");

      const tx = await provider.send("eth_getTransactionByHash", [hash]);
      assert(tx.transactionIndex, "0x0");
    });
  });
});
