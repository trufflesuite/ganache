import assert from "assert";
import {
  EIP1559FeeMarketRpcTransaction,
  TransactionFactory
} from "@ganache/ethereum-transaction";
import { EthereumOptionsConfig } from "@ganache/ethereum-options";
import Wallet from "../src/wallet";
import Blockchain from "../src/blockchain";
import { Block } from "@ganache/ethereum-block";

describe("blockchain", async () => {
  describe("interval mining", () => {
    it("mines only one block, even when pool is full enough for multiple", async () => {
      // set up options
      // block gas limit to only fit one tx
      // interval mining mode
      // eager instamine so tx is fully mined when we race them
      const gasLimit = "0x5208";
      const blockTime = 1;
      const optionsJson = {
        miner: {
          blockGasLimit: gasLimit,
          blockTime,
          instamine: "strict" as const
        }
      };
      const options = EthereumOptionsConfig.normalize(optionsJson);

      // set up wallet/blockchain
      const wallet = new Wallet(options.wallet, options.logging);
      const initialAccounts = wallet.initialAccounts;
      const blockchain = new Blockchain(options, initialAccounts[0].address);
      await blockchain.initialize(wallet.initialAccounts);
      const common = blockchain.common;

      // set up two transactions
      const [from, to] = wallet.addresses;
      const secretKey = wallet.unlockedAccounts.get(from);
      const rpcTx: EIP1559FeeMarketRpcTransaction = {
        from,
        to,
        gasLimit,
        maxFeePerGas: "0xffffffff",
        type: "0x2",
        nonce: "0x0"
      };
      const transaction1 = TransactionFactory.fromRpc(rpcTx, common);
      const transaction2 = TransactionFactory.fromRpc(
        { ...rpcTx, nonce: "0x1" },
        common
      );

      const transaction1Promise = blockchain.queueTransaction(
        transaction1,
        secretKey
      );
      const transaction2Promise = blockchain.queueTransaction(
        transaction2,
        secretKey
      );
      // we're in strict mode, so transactions are in the pool and not yet mined
      const transactionHashes = await Promise.all([
        transaction1Promise,
        transaction2Promise
      ]);

      const timestamps: number[] = [];
      let i = 0;
      const startingBlockNumber =
        blockchain.blocks.latest.header.number.toNumber();

      // wait for our two transactions to be mined by waiting for the chain to
      // emit the block events. verify that it's the correct transaction, and
      // store the timestamp
      const assertBlocks = new Promise<boolean>((resolve, reject) => {
        const off = blockchain.on("block", async (block: Block) => {
          const transactions = block.getTransactions();
          if (transactions.length === 0) return;
          // a failed assertion inside of this promise doesn't fail the test,
          // it just stops this promise early. so catch any failures, reject the
          // promise, and use that rejection to fail the test
          try {
            const blockNumber = block.header.number.toString();
            const expectedBlockNumber = startingBlockNumber + i + 1;
            assert.strictEqual(
              blockNumber,
              `0x${expectedBlockNumber.toString(16)}`
            );
            assert.strictEqual(transactions.length, 1);

            const transaction = transactions[0];
            assert.strictEqual(
              transaction.hash.toString(),
              transactionHashes[i].toString()
            );

            timestamps.push(block.header.timestamp.toNumber());
            i++;
            if (i === 2) {
              off();
              resolve(true);
            }
          } catch (e) {
            off();
            console.error(e);
            reject(false);
          }
        });
      });
      const success = await assertBlocks;
      assert(success, "expected to mine two blocks with one transaction each");
      // assert that second block's timestamp is at least `blockTime` greater
      // than the first block's. meaning, these blocks weren't mined one after
      // the other
      assert(
        timestamps[1] >= timestamps[0] + blockTime,
        `Unexpected timestamp - expected >= ${timestamps[0] + blockTime}, got ${
          timestamps[1]
        }`
      );
    });
  });
});
