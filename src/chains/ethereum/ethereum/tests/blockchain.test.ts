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
      // setup options
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

      // setup wallet/blockchain
      const wallet = new Wallet(options.wallet);
      const initialAccounts = wallet.initialAccounts;
      const blockchain = new Blockchain(options, initialAccounts[0].address);
      await blockchain.initialize(wallet.initialAccounts);
      const common = blockchain.common;

      // setup two transactions
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
      const transactionHashes = await Promise.all([
        transaction1Promise,
        transaction2Promise
      ]);

      const timestamps: number[] = [];
      let i = 0;
      const startingBlockNumber =
        blockchain.blocks.latest.header.number.toNumber();
      const assertBlocks = new Promise(resolve => {
        const off = blockchain.on("block", async (block: Block) => {
          const transactions = block.getTransactions();
          if (transactions.length === 0) return;
          try {
            console.log("mined one!");
            const blockNumber = block.header.number.toString();
            const expectedBlockNumber = startingBlockNumber + i + 1;
            assert.equal(blockNumber, `0x${expectedBlockNumber.toString(16)}`);
            assert.equal(transactions.length, 1);

            const transaction = transactions[0];
            assert.equal(transaction.nonce.toString(), `0x${i.toString(16)}`);
            assert.equal(
              transaction.hash.toString(),
              transactionHashes[i].toString()
            );

            timestamps.push(block.header.timestamp.toNumber());
            i++;
            console.log("i", i);
            if (i === 2) {
              resolve(void 0);
              off();
            }
          } catch (e) {
            console.log(e);
          }
        });
      });
      // enough time for two blocks to be mined, plus some padding
      await new Promise(resolve => setTimeout(resolve, blockTime * 1000 * 2.2));
      //await assertBlocks;
      assert(timestamps[1] >= timestamps[0] + blockTime);
    }).timeout(0);
  });
});
