const Web3 = require("web3");
const assert = require("assert");
const Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
const fs = require("fs");
const path = require("path");
const solc = require("solc");
const to = require("../lib/utils/to.js");
const pify = require("pify");
const RSCLEAR_REFUND = 15000;
const RSELFDESTRUCT_REFUND = 24000;
const { sleep } = require("./helpers/utils");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

let mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

describe("Gas", function() {
  let estimateGasContractData;
  let estimateGasContractAbi;
  let EstimateGasContract;
  let estimateGasInstance;
  let deploymentReceipt;

  const provider = Ganache.provider({ mnemonic });
  const web3 = new Web3(provider);
  let accounts = [];

  before("get accounts", async function() {
    accounts = await web3.eth.getAccounts();
  });

  before("compile source", async function() {
    this.timeout(10000);
    const source = fs.readFileSync(path.join(__dirname, "EstimateGas.sol"), "utf8");
    const result = solc.compile({ sources: { "EstimateGas.sol": source } }, 1);

    estimateGasContractData = "0x" + result.contracts["EstimateGas.sol:EstimateGas"].bytecode;
    estimateGasContractAbi = JSON.parse(result.contracts["EstimateGas.sol:EstimateGas"].interface);

    EstimateGasContract = new web3.eth.Contract(estimateGasContractAbi);
    let promiEvent = EstimateGasContract.deploy({ data: estimateGasContractData }).send({
      from: accounts[0],
      gas: 3141592
    });

    promiEvent.on("receipt", function(receipt) {
      deploymentReceipt = receipt;
    });

    estimateGasInstance = await promiEvent;
  });

  after("cleanup", function() {
    web3.setProvider(null);
    provider.close(() => {});
  });

  async function deployContract(tempWeb3) {
    let contract = new tempWeb3.eth.Contract(estimateGasContractAbi);

    return contract.deploy({ data: estimateGasContractData }).send({ from: accounts[0], gas: 3141592 });
  }

  describe("Refunds", function() {
    it("accounts for Rsclear Refund in gasEstimate", async() => {
      const from = accounts[0];
      const options = { from, gas: 5000000 };

      await estimateGasInstance.methods.reset().send(options); // prime storage by making sure it is set to 0

      const method = estimateGasInstance.methods.triggerRsclearRefund();

      let gasEstimate = await method.estimateGas(options);

      let receipt = await method.send({ from, gas: gasEstimate });

      assert.strictEqual(receipt.gasUsed, gasEstimate - RSCLEAR_REFUND);
      assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
    });

    it("accounts for Rselfdestruct Refund in gasEstimate", async() => {
      const from = accounts[0];
      const options = { from, gas: 5000000 };

      const instance = await deployContract(web3);
      await instance.methods.reset().send(options); // prime storage by making sure it is set to 0

      const method = instance.methods.triggerRselfdestructRefund();

      let gasEstimate = await method.estimateGas(options);

      let receipt = await method.send({ from, gas: gasEstimate });

      assert.strictEqual(receipt.gasUsed, gasEstimate - RSELFDESTRUCT_REFUND);
      assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
    });

    it("accounts for Rsclear and Rselfdestruct Refunds in gasEstimate", async() => {
      const from = accounts[0];

      const instance = await deployContract(web3);
      await instance.methods.reset().send({ from, gas: 5000000 }); // prime storage by making sure it is set to 0

      const method = instance.methods.triggerAllRefunds();

      const gasEstimate = await method.estimateGas({ from });

      let receipt = await method.send({ from, gas: gasEstimate });

      assert.strictEqual(receipt.gasUsed, gasEstimate - RSELFDESTRUCT_REFUND - RSCLEAR_REFUND);
      assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
    });

    it("accounts for Rsclear & Rselfdestruct Refunds in gasEstimate w/ multiple transactions in the block", async() => {
      const ganacheProvider = Ganache.provider({
        blockTime: 0.5, // seconds
        mnemonic: mnemonic
      });

      let tempWeb3;

      try {
        tempWeb3 = new Web3(ganacheProvider);

        const from = (await tempWeb3.eth.getAccounts())[0];

        let transactions = [
          {
            value: "0x10000000",
            gasLimit: "0x33450",
            from: accounts[2],
            to: accounts[1],
            nonce: "0x0"
          },
          {
            value: "0x10000000",
            gasLimit: "0x33450",
            from: accounts[2],
            to: accounts[1],
            nonce: "0x1"
          },
          {
            value: "0x10000000",
            gasLimit: "0x33450",
            from: accounts[1], // <
            to: accounts[2], // <^ reversed tx order
            nonce: "0x0"
          }
        ];

        // Precondition
        const initialBlockNumber = await tempWeb3.eth.getBlockNumber();
        assert.deepStrictEqual(initialBlockNumber, 0, "Current Block Should be 0");

        const localGasInstance = await deployContract(tempWeb3);

        // prime storage by making sure it is set to 0
        await localGasInstance.methods.reset().send({ from, gas: 5000000 });
        const method = localGasInstance.methods.triggerAllRefunds();
        const gasEstimate = await method.estimateGas({ from });

        let hashes = await Promise.all(
          transactions.map((transaction) => {
            let promiEvent = tempWeb3.eth.sendTransaction(transaction);

            return new Promise((resolve) => {
              promiEvent.once("transactionHash", async(hash) => {
                // Ensure there's no receipt since the transaction hasn't yet been processed. Ensure IntervalMining
                let receipt = await tempWeb3.eth.getTransactionReceipt(hash);
                assert.strictEqual(receipt, null, "No receipt since the transaction hasn't yet been processed.");

                resolve(hash);
              });
            });
          })
        );
        let currentBlockNumber = await tempWeb3.eth.getBlockNumber();
        assert.deepStrictEqual(currentBlockNumber, 2, "Current Block Should be 2");

        const receipt = await method.send({ from, gas: gasEstimate });

        let transactionCostMinusRefund = gasEstimate - RSELFDESTRUCT_REFUND - RSCLEAR_REFUND;
        assert.strictEqual(receipt.gasUsed, transactionCostMinusRefund);

        let receipts = await Promise.all(hashes.map((hash) => tempWeb3.eth.getTransactionReceipt(hash)));
        assert.deepStrictEqual(receipts[0].gasUsed, receipts[1].gasUsed, "Tx1 and Tx2 should cost the same gas.");
        assert.deepStrictEqual(
          receipts[1].gasUsed,
          receipts[2].gasUsed,
          "Tx2 and Tx3 should cost the same gas. -> Tx1 gas === Tx3 gas Transitive"
        );
        assert.deepStrictEqual(
          receipts[1].transactionIndex > receipts[2].transactionIndex,
          true,
          "(Tx3 has a lower nonce) -> (Tx3 index is < Tx2 index)"
        );
        let currentBlock = await tempWeb3.eth.getBlock(receipts[0].blockNumber);

        // ( Tx3 has a lower nonce -> Tx3 index is < Tx2 index ) -> cumulative gas Tx2 > Tx3 > Tx1
        let isAccumulating =
          receipts[1].cumulativeGasUsed > receipts[2].cumulativeGasUsed &&
          receipts[2].cumulativeGasUsed > receipts[0].cumulativeGasUsed;
        assert.deepStrictEqual(
          isAccumulating,
          true,
          "Cumulative gas should be accumulating for any transactions in the same block."
        );
        assert.deepStrictEqual(
          receipts[0].gasUsed,
          receipts[0].cumulativeGasUsed,
          "Gas and cumulative gas should be equal for the FIRST Tx."
        );
        assert.notDeepStrictEqual(
          receipts[1].gasUsed,
          receipts[1].cumulativeGasUsed,
          "Gas and cumulative gas should NOT be equal for the Second Tx."
        );
        assert.notDeepStrictEqual(
          receipts[2].gasUsed,
          receipts[2].cumulativeGasUsed,
          "Gas and cumulative gas should NOT be equal for the Third Tx."
        );

        let totalGas = receipts[0].gasUsed + receipts[1].gasUsed + receipts[2].gasUsed;
        assert.deepStrictEqual(
          totalGas + transactionCostMinusRefund,
          receipts[1].cumulativeGasUsed,
          "Total Gas should equal the final tx.cumulativeGas"
        );
        assert.deepStrictEqual(
          totalGas + transactionCostMinusRefund,
          currentBlock.gasUsed,
          "Total Gas should be equal to the currentBlock.gasUsed"
        );
      } catch (e) {
        assert(false, e);
      } finally {
        // clean up after ourselves
        if (tempWeb3) {
          tempWeb3.setProvider(null);
        }
        await pify(ganacheProvider.close)();
      }
    });

    it("clears mapping storage slots", async() => {
      const options = { from: accounts[0] };

      await estimateGasInstance.methods.reset().send({ from: options.from, gas: 5000000 });

      const uintsa = await estimateGasInstance.methods.uints(1).call();
      assert.strictEqual(uintsa, "0", "initial value is not correct");

      const receipta = await estimateGasInstance.methods.store(1).send(options);
      assert.strictEqual(receipta.status, true, "storing value did not work");

      const uintsb = await estimateGasInstance.methods.uints(1).call();
      assert.strictEqual(uintsb, "1", "set value is incorrect");

      const receiptb = await estimateGasInstance.methods.clear().send(options);
      assert.strictEqual(receiptb.status, true, "clearing value did not work");

      const uintsc = await estimateGasInstance.methods.uints(1).call();
      assert.strictEqual(uintsc, "0", "cleared value is not correct");
    });
  });

  describe("Estimation", function() {
    async function testTransactionEstimate(contractFn, args, options) {
      await estimateGasInstance.methods.reset().send({ from: options.from, gas: 5000000 });
      const method = contractFn(...args);
      const gasEstimate = await method.estimateGas(options);
      const receipt = await method.send(options);

      assert.strictEqual(receipt.status, true, "Transaction must succeed");
      assert.strictEqual(receipt.gasUsed, gasEstimate, "gasUsed");
      assert.strictEqual(receipt.cumulativeGasUsed, gasEstimate, "estimate");
    }

    it("matches estimate for deployment", async function() {
      let gasEstimate = await EstimateGasContract.deploy({ data: estimateGasContractData }).estimateGas({
        from: accounts[1]
      });

      assert.deepStrictEqual(deploymentReceipt.gasUsed, gasEstimate);
      assert.deepStrictEqual(deploymentReceipt.cumulativeGasUsed, gasEstimate);
    });

    it("matches usage for complex function call (add)", async function() {
      this.timeout(10000);
      await testTransactionEstimate(estimateGasInstance.methods.add, [toBytes("Tim"), toBytes("A great guy"), 10], {
        from: accounts[0],
        gas: 3141592
      });
    });

    it("matches usage for complex function call (transfer)", async function() {
      this.timeout(10000);
      await testTransactionEstimate(
        estimateGasInstance.methods.transfer,
        ["0x0123456789012345678901234567890123456789", 5, toBytes("Tim")],
        { from: accounts[0], gas: 3141592 }
      );
    });

    function toBytes(s) {
      let bytes = Array.prototype.map.call(s, function(c) {
        return c.codePointAt(0);
      });

      return to.hex(Buffer.from(bytes));
    }

    it("matches usage for simple account to account transfer", async function() {
      let transferAmount = web3.utils.toBN(web3.utils.toWei("5", "finney"));
      let transactionData = {
        from: accounts[0],
        to: accounts[1],
        value: transferAmount
      };

      let gasEstimate = await web3.eth.estimateGas(transactionData);

      let receipt = await web3.eth.sendTransaction(transactionData);

      assert.strictEqual(receipt.gasUsed, gasEstimate);
    });
  });

  describe("Expenditure", function() {
    async function testGasExpenseIsCorrect(expectedGasPrice, setGasPriceOnTransaction = false, w3 = web3) {
      const transferAmount = w3.utils.toBN(w3.utils.toWei("5", "finney"));

      expectedGasPrice = w3.utils.toBN(expectedGasPrice);

      const initialBalance = await w3.utils.toBN(await w3.eth.getBalance(accounts[0]));

      let params = {
        from: accounts[0],
        to: accounts[1],
        value: transferAmount
      };

      if (setGasPriceOnTransaction) {
        params.gasPrice = expectedGasPrice;
      }

      const receipt = await w3.eth.sendTransaction(params);
      const gasUsed = w3.utils.toBN(receipt.gasUsed);

      const finalBalance = w3.utils.toBN(await w3.eth.getBalance(accounts[0]));
      const deltaBalance = initialBalance.sub(finalBalance);

      // the amount we paid in excess of our transferAmount is what we spent on gas
      const gasExpense = deltaBalance.sub(transferAmount);

      assert(!gasExpense.eq(w3.utils.toBN("0")), "Calculated gas expense must be nonzero.");

      // gas expense is just gasPrice * gasUsed, so just solve accordingly
      const actualGasPrice = gasExpense.div(gasUsed);

      assert(
        expectedGasPrice.eq(actualGasPrice),
        `Gas price used by EVM (${to.hex(actualGasPrice)}) was different from` +
          ` expected gas price (${to.hex(expectedGasPrice)})`
      );
    }

    it("should calculate gas expenses correctly in consideration of the default gasPrice", async function() {
      await testGasExpenseIsCorrect(await web3.eth.getGasPrice());
    });

    it("should calculate gas expenses correctly in consideration of the requested gasPrice", async function() {
      await testGasExpenseIsCorrect("0x10000", true);
    });

    it("should calculate gas expenses correctly in consideration of a user-defined default gasPrice", async() => {
      let gasPrice = "0x2000";
      let provider = Ganache.provider({ mnemonic, gasPrice });
      let tempWeb3;
      try {
        tempWeb3 = new Web3(provider);
        await testGasExpenseIsCorrect(gasPrice, false, new Web3(Ganache.provider({ mnemonic, gasPrice })));
      } catch (e) {
        if (tempWeb3) {
          tempWeb3.setProvider(null);
        }
        provider.stop(() => {});
      }
    });

    it("should calculate cumalativeGas and gasUsed correctly when multiple transactions are in a block", async() => {
      let provider = Ganache.provider({
        blockTime: 0.5, // seconds
        mnemonic: mnemonic
      });

      let tempWeb3;

      try {
        tempWeb3 = new Web3(provider);

        let transactions = [
          {
            value: "0x10000000",
            gasLimit: "0x33450",
            from: accounts[0],
            to: accounts[1],
            nonce: "0x0"
          },
          {
            value: "0x10000000",
            gasLimit: "0x33450",
            from: accounts[0],
            to: accounts[1],
            nonce: "0x1"
          },
          {
            value: "0x10000000",
            gasLimit: "0x33450",
            from: accounts[1], // <
            to: accounts[0], // <^ reversed tx order
            nonce: "0x0"
          }
        ];

        // Precondition
        const initialBlockNumber = await tempWeb3.eth.getBlockNumber();
        assert.deepStrictEqual(initialBlockNumber, 0, "Current Block Should be 0");

        let hashes = await Promise.all(
          transactions.map((transaction) => {
            let promiEvent = tempWeb3.eth.sendTransaction(transaction);

            return new Promise((resolve) => {
              promiEvent.once("transactionHash", async(hash) => {
                // Ensure there's no receipt since the transaction hasn't yet been processed. Ensure IntervalMining
                let receipt = await tempWeb3.eth.getTransactionReceipt(hash);
                assert.strictEqual(receipt, null, "No receipt since the transaction hasn't yet been processed.");

                resolve(hash);
              });
            });
          })
        );

        // Wait .75 seconds (1.5x the mining interval) then get the receipt. It should be processed.
        await sleep(750);

        let currentBlockNumber = await tempWeb3.eth.getBlockNumber();
        assert.deepStrictEqual(currentBlockNumber, 1, "Current Block Should be 1");

        let currentBlock = await tempWeb3.eth.getBlock(currentBlockNumber);

        let receipts = await Promise.all(hashes.map((hash) => tempWeb3.eth.getTransactionReceipt(hash)));

        assert.deepStrictEqual(receipts[0].gasUsed, receipts[1].gasUsed, "Tx1 and Tx2 should cost the same gas.");
        assert.deepStrictEqual(
          receipts[1].gasUsed,
          receipts[2].gasUsed,
          "Tx2 and Tx3 should cost the same gas. -> Tx1 gas === Tx3 gas Transitive"
        );
        assert.deepStrictEqual(
          receipts[1].transactionIndex > receipts[2].transactionIndex,
          true,
          "(Tx3 has a lower nonce) -> (Tx3 index is < Tx2 index)"
        );

        // ( Tx3 has a lower nonce -> Tx3 index is < Tx2 index ) -> cumulative gas Tx2 > Tx3 > Tx1
        let isAccumulating =
          receipts[1].cumulativeGasUsed > receipts[2].cumulativeGasUsed &&
          receipts[2].cumulativeGasUsed > receipts[0].cumulativeGasUsed;
        assert.deepStrictEqual(
          isAccumulating,
          true,
          "Cumulative gas should be accumulating for any transactions in the same block."
        );
        assert.deepStrictEqual(
          receipts[0].gasUsed,
          receipts[0].cumulativeGasUsed,
          "Gas and cumulative gas should be equal for the FIRST Tx."
        );
        assert.notDeepStrictEqual(
          receipts[1].gasUsed,
          receipts[1].cumulativeGasUsed,
          "Gas and cumulative gas should NOT be equal for the Second Tx."
        );
        assert.notDeepStrictEqual(
          receipts[2].gasUsed,
          receipts[2].cumulativeGasUsed,
          "Gas and cumulative gas should NOT be equal for the Third Tx."
        );

        let totalGas = receipts[0].gasUsed + receipts[1].gasUsed + receipts[2].gasUsed;
        assert.deepStrictEqual(
          totalGas,
          receipts[1].cumulativeGasUsed,
          "Total Gas should be equal the final tx.cumulativeGas"
        );
        assert.deepStrictEqual(totalGas, currentBlock.gasUsed, "Total Gas should be equal to the currentBlock.gasUsed");
      } catch (e) {
        assert(false, e);
      } finally {
        if (tempWeb3) {
          tempWeb3.setProvider(null);
        }
        await pify(provider.close)();
      }
    });
  });
});
