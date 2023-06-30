import assert from "assert";
import { Address } from "@ganache/ethereum-address";
import { BUFFER_ZERO, Data, Quantity } from "@ganache/utils";
import { Common } from "@ethereumjs/common";
import Wallet from "../../ethereum/src/wallet";
import { Transaction, TransactionFactory } from "@ganache/ethereum-transaction";
import Blockchain from "../../ethereum/src/blockchain";
import { EthereumOptionsConfig } from "../../options/src/index";

describe("@ganache/ethereum-block", async () => {
  describe("baseFeePerGas calculations", () => {
    let blockchain: Blockchain;
    before(async function () {
      this.timeout(10000);
      const privKey = `0x${"46".repeat(32)}`;
      const privKeyData = Data.from(privKey);
      const options = EthereumOptionsConfig.normalize({
        wallet: {
          accounts: [
            { secretKey: privKey, balance: 1000000000000000000000n },
            {
              secretKey: `0x${"46".repeat(31)}47`,
              balance: 1000000000000000000000n
            }
          ]
        },
        miner: {
          blockGasLimit: "0xB749E0"
        },
        chain: { chainId: 1337 },
        logging: { logger: { log: (_message: string) => {} } } // ignore logging
      });
      const wallet = new Wallet(options.wallet, options.logging);
      const [from, to] = wallet.addresses;
      const fromAddress = Address.from(from);
      const tx: Transaction = {
        type: "0x2",
        from: from,
        to: to,
        maxFeePerGas: "0x344221FFF",
        chainId: "0x539",
        gas: "0x5208"
      };

      const common = Common.custom(
        {
          chainId: 1337,
          comment: "Local test network",
          bootstrapNodes: [],
          defaultHardfork: "grayGlacier"
        },
        { baseChain: "mainnet" }
      );
      blockchain = new Blockchain(options, fromAddress);
      await blockchain.initialize(wallet.initialAccounts);
      // to verify our calculations for the block's baseFeePerGas,
      // we're comparing our data to geth. Geth's gasLimit changes
      // every block, so we need to set those values here according
      // to what geth had. We'll need to reset each time a block is
      // mined and we'll need to mine blocks such that we have one
      // with each of the cases: 1. gasUsed < gasTarget, 2. gasUsed >
      // gasTarget, gasUsed = gasTarget.
      const gethBlockData = [
        { txCount: 286, newGasLimit: 12000271 },
        { txCount: 290, newGasLimit: 11988553 },
        { txCount: 10, newGasLimit: 11976847 },
        // because we use the previous block to calculate the base fee,
        // send/mine one more tx so we can see what the resulting base fee
        // is from the previous block
        { txCount: 1, newGasLimit: 11965152 }
      ];

      for (let i = 0; i < gethBlockData.length; i++) {
        const data = gethBlockData[i];
        options.miner.blockGasLimit = Quantity.from(data.newGasLimit);
        blockchain.pause();
        for (let j = 0; j < data.txCount; j++) {
          const feeMarketTx = TransactionFactory.fromRpc(tx, common);
          await blockchain.queueTransaction(feeMarketTx, privKeyData);
        }
        // mine all txs in that group before moving onto the next block
        await blockchain.resume();
      }
    });
    it("has initial baseFeePerGas of 1000000000 for genesis block", async () => {
      const block = await blockchain.blocks.get(BUFFER_ZERO);
      assert.strictEqual(block.header.baseFeePerGas.toNumber(), 1000000000);
    });
    it("calculates baseFeePerGas correctly when gasUsed is equal to gasTarget", async () => {
      const block = await blockchain.blocks.get(Buffer.from([2]));
      assert.strictEqual(block.header.baseFeePerGas.toNumber(), 875106911);
    });
    it("calculates baseFeePerGas correctly when gasUsed is above gasTarget", async () => {
      const block = await blockchain.blocks.get(Buffer.from([3]));
      assert.strictEqual(block.header.baseFeePerGas.toNumber(), 876853759);
    });
    it("calculates baseFeePerGas correctly when gasUsed is below gasTarget", async () => {
      const block = await blockchain.blocks.get(Buffer.from([4]));
      assert.strictEqual(block.header.baseFeePerGas.toNumber(), 771090691);
    });
  });
});
