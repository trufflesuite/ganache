import assert from "assert";
import { Address } from "@ganache/ethereum-address";
import { Common } from "@ethereumjs/common";
import {
  TransactionFactory,
  Transaction,
  TypedTransaction
} from "@ganache/ethereum-transaction";
import Blockchain from "../../src/blockchain";
import Wallet from "../../src/wallet";
import { EthereumOptionsConfig } from "@ganache/ethereum-options";

describe("miner", async () => {
  describe("pre-london transaction ordering", () => {});
  describe("london transaction pool prioritization", () => {
    let lowGasLimitBlockchain: Blockchain;
    let highGasLimitBlockchain: Blockchain;
    let highBlockJson: any;
    let common: Common;
    let from1: string, from2: string, from3: string, to: string;

    before(async function () {
      this.timeout(5000);
      common = Common.custom(
        {
          name: "ganache",
          chainId: 1337,
          comment: "Local test network",
          bootstrapNodes: [],
          defaultHardfork: "grayGlacier"
        },
        { baseChain: "mainnet" }
      );
      const optionsJson = {
        wallet: {
          deterministic: true
        },
        miner: {
          blockGasLimit: "0x5208" // 21000, or sending one empty tx
        },
        chain: { chainId: 1337 }
      };
      const options = EthereumOptionsConfig.normalize(optionsJson);
      const wallet = new Wallet(options.wallet, options.logging);
      [from1, from2, from3, to] = wallet.addresses;
      const fromAddress = Address.from(from1);

      lowGasLimitBlockchain = new Blockchain(options, fromAddress);
      await lowGasLimitBlockchain.initialize(wallet.initialAccounts);
      optionsJson.miner.blockGasLimit = "0xB749E0"; // 12012000
      const highGasOptions = EthereumOptionsConfig.normalize(optionsJson);
      highGasLimitBlockchain = new Blockchain(highGasOptions, fromAddress);
      await highGasLimitBlockchain.initialize(wallet.initialAccounts);

      /*
      For the lowGasLimitBlockchain:
          block 1 baseFeePerGas: 875,000,000
          tx1: gasPrice: 990,000,000
          tx2: maxFeePerGas: 990,000,000, maxPriorityFee: 5,630,000 => effectiveGasPrice = 880,630,000
          tx3: gasPrice: 987,000,000
          order of queue should be tx1, tx3, tx2

          1 block is mined with tx1 in it
          new baseFeePerGas: 984,375,000
          tx2: maxFeePerGas: 990,000,000, maxPriorityFee: 5,630,000 => effectiveGasPrice = 990,000,000
          tx3: gasPrice 987,000,000
          order of queue should now be tx2, tx3

          1 block is mined with tx2 in it
          baseFeePerGas: 1,107,421,875
          tx3 now has too low a gas price to be mined

        For the highGasLimitBlockchain:
          all three would be mined in one block with the order: tx1, tx3, tx2
       */
      const txs: Transaction[] = [
        {
          type: "0x0",
          from: from1,
          to: to,
          gasPrice: "0x3B023380", // 990,000,000
          gas: "0x5208"
        },
        {
          type: "0x2",
          from: from2,
          to: to,
          maxFeePerGas: "0x3B023380", // 990,000,000
          maxPriorityFeePerGas: "0x55E830", // 5,630,000
          chainId: "0x539",
          gas: "0x5208"
        },
        {
          type: "0x0",
          from: from3,
          to: to,
          gasPrice: "0x3AD46CC0", // 987,000,000
          gas: "0x5208"
        }
      ];
      const blockchains = [lowGasLimitBlockchain, highGasLimitBlockchain];
      for (let j = 0; j < blockchains.length; j++) {
        const blockchain = blockchains[j];
        blockchain.pause();
        for (let i = 0; i < txs.length; i++) {
          const txRpc = txs[i];
          const secretKey = wallet.unlockedAccounts.get(txRpc.from);
          const tx: TypedTransaction = TransactionFactory.fromRpc(
            txRpc,
            common
          );
          await blockchain.queueTransaction(tx, secretKey);
        }
        await blockchain.resume();
      }

      // Wait until the the `blockchain` actually says the
      // `highGasLimitBlockchain` block is ready as `await blockchain.resume()`
      // above doesn't guarantee that the `blockchain` has processed the the
      // block.
      await highGasLimitBlockchain.once("block");

      // all txs are on this one block so lets save for future use
      const highGasBlock = await highGasLimitBlockchain.blocks.get(
        Buffer.from([1])
      );
      highBlockJson = highGasBlock.toJSON(true);
    });

    it("orders transactions by gasPrice", async () => {
      const block = await lowGasLimitBlockchain.blocks.get(Buffer.from([1]));
      const lowBlockJson = block.toJSON(true);
      const lowBlockTxJson = lowBlockJson.transactions[0] as any;
      // because of our low gas price, only one transaction should be on the block.
      assert.strictEqual(lowBlockJson.transactions.length, 1);
      // the first tx mined in our lowBlock chain (i.e., the only tx on the first block)
      // should be the same as the first tx mined on our highBlock chain
      assert.strictEqual(
        lowBlockTxJson.from.toString(),
        (highBlockJson.transactions[0] as any).from.toString()
      );
      // the gasPrice should be equal to the initial gasPrice set on the tx
      assert.strictEqual(lowBlockTxJson.gasPrice.toString(), "0x3b023380");
    });

    it("updates baseFeePerGas and order of tx pool when a new block is mined", async () => {
      const block = await lowGasLimitBlockchain.blocks.get(Buffer.from([2]));
      const lowBlockJson = block.toJSON(true);
      const lowBlockTxJson = lowBlockJson.transactions[0] as any;
      // because of our low gas price, only one transaction should be on the block.
      assert.strictEqual(lowBlockJson.transactions.length, 1);
      // the second tx mined in our lowBlock chain (i.e., the only tx on the second block)
      // should be the same as the THIRD tx mined on our highBlock chain.
      // This proves that the lowBlock chain's pool was reordered when a new block was mined.
      assert.strictEqual(
        lowBlockTxJson.from.toString(),
        (highBlockJson.transactions[2] as any).from.toString()
      );
      // the gasPrice should be equal to the maxFeePerGas set on the tx because of the
      // increase in price of the baseFeePerGas after the block was mined
      assert.strictEqual(lowBlockTxJson.gasPrice.toString(), "0x3b023380");
    });

    it("updates baseFeePerGas and rejects txs that don't pay enough for gas when a new block is mined", async () => {
      const block = await lowGasLimitBlockchain.blocks.get(Buffer.from([3]));
      const lowBlockJson = block.toJSON(false);
      // the low gas limit chain will be too expensive for the remaining tx, so it won't be included in the block
      assert.strictEqual(lowBlockJson.transactions.length, 0);
      // the remaining tx should be second tx of the high limit block
      assert.strictEqual(
        (highBlockJson.transactions[1] as any).from.toString(),
        from3
      );
    });
  });
});
