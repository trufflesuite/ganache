const assert = require("assert");
const { sleep } = require("../helpers/utils/sleep");
const bootstrap = require("../helpers/contract/bootstrap");
const getWeb3 = require("../helpers/web3/getWeb3");
const isGasExpenseCorrect = require("./lib/isGasExpenseCorrect");
const testTransactionEstimate = require("./lib/transactionEstimate");
const toBytes = require("./lib/toBytes");
const deployContract = require("./lib/customContractDeploy");

const RSCLEAR_REFUND = 15000;
const RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO = 19800;
const RSELFDESTRUCT_REFUND = 24000;

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

describe("Gas", () => {
  const mainContract = "EstimateGas";
  const contractFilenames = [];
  const contractPath = "../../contracts/gas/";

  const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
  const options = { mnemonic };
  const services = bootstrap(mainContract, contractFilenames, options, contractPath);

  let deploymentReceipt;

  before("Adding funds to the contract", async function() {
    this.timeout(10000);
    const { accounts, bytecode, contract } = services;

    const promiEvent = contract.deploy({ data: bytecode }).send({
      from: accounts[0],
      gas: 3141592
    });

    promiEvent.on("receipt", (receipt) => {
      deploymentReceipt = receipt;
    });
  });

  describe("Refunds", () => {
    it(
      "accounts for Rsclear Refund in gasEstimate when a dirty storage slot is reset and it's original " +
        " value is 0",
      async() => {
        const { accounts, instance, provider } = services;
        const from = accounts[0];
        const options = { from, gas: 5000000 };

        // prime storage by making sure it is set to 0
        await instance.methods.reset().send(options);

        // update storage and then reset it back to 0
        const method = instance.methods.triggerRsclearRefund();

        const gasEstimate = await method.estimateGas(options);

        const { gasUsed, cumulativeGasUsed } = await method.send({ from, gas: gasEstimate });

        if (provider.options.hardfork === "byzantium") {
          assert.strictEqual(gasUsed, gasEstimate - RSCLEAR_REFUND);
        } else if (provider.options.hardfork === "constantinople") {
          // since storage was initially primed to 0 and we call triggerRsclearRefund(), which then
          // resets storage back to 0, 19800 gas is added to the refund counter per Constantinople EIP 1283
          assert.strictEqual(gasUsed, gasEstimate - RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO);
        }
        assert.strictEqual(gasUsed, cumulativeGasUsed);
      }
    );

    it(
      "accounts for Rsclear Refund in gasEstimate when a dirty storage slot is reset and it's " +
        "original value is not 0",
      async() => {
        const { accounts, instance, provider } = services;
        const from = accounts[0];
        const rsclearRefundForResettingDirtySlotToNonZeroValue = 4800;
        const options = { from, gas: 5000000 };

        await instance.methods.reset().send(options); // prime storage by making sure y is set to 1

        // update storage and then reset it back to 1
        const method = instance.methods.triggerRsclearRefundForY();

        const gasEstimate = await method.estimateGas(options);

        const { gasUsed, cumulativeGasUsed } = await method.send({ from, gas: gasEstimate });

        if (provider.options.hardfork === "byzantium") {
          // since we are resetting to a non-zero value, there is no gas added to the refund counter here
          assert.strictEqual(gasUsed, gasEstimate);
        } else if (provider.options.hardfork === "constantinople") {
          // since storage was initially primed to 1 and we call triggerRsclearRefundForY(), which then
          // resets storage back to 1, 4800 gas is added to the refund counter per Constantinople EIP 1283
          assert.strictEqual(gasUsed, gasEstimate - rsclearRefundForResettingDirtySlotToNonZeroValue);
        }
        assert.strictEqual(gasUsed, cumulativeGasUsed);
      }
    );

    it(
      "accounts for Rsclear Refund in gasEstimate when a fresh storage slot's original " +
        "value is not 0 and new value is 0",
      async() => {
        const { accounts, instance, provider } = services;
        const from = accounts[0];
        const rsclearRefundForUpdatingFreshSlotToZero = 15000;
        const options = { from, gas: 5000000 };

        // prime storage by making sure storage is set to 1
        await instance.methods.initialSettingOfX().send(options);

        // update storage to be 0
        const method = instance.methods.reset();

        const gasEstimate = await method.estimateGas(options);

        const { gasUsed, cumulativeGasUsed } = await method.send({ from, gas: gasEstimate });

        if (provider.options.hardfork === "byzantium") {
          assert.strictEqual(gasUsed, gasEstimate - RSCLEAR_REFUND);
        } else if (provider.options.hardfork === "constantinople") {
          // since storage was initially primed to 1 and we call reset(), which then sets
          // storage to 0, 15000 gas is added to the refund counter per Constantinople EIP 1283
          assert.strictEqual(gasUsed, gasEstimate - rsclearRefundForUpdatingFreshSlotToZero);
        }
        assert.strictEqual(gasUsed, cumulativeGasUsed);
      }
    );

    it(
      "accounts for Rsclear Refund in gasEstimate when a dirty storage slot's original value " +
        "is not 0 and new value is 0",
      async() => {
        const { accounts, instance, provider } = services;
        const from = accounts[0];
        const rsclearRefundForUpdatingDirtySlotToZero = 15000;
        const options = { from, gas: 5000000 };

        // prime storage by making sure storage is set to 1
        await instance.methods.initialSettingOfX().send(options);

        // update storage and then reset it to 0
        const method = instance.methods.triggerRsclearRefund();

        const gasEstimate = await method.estimateGas(options);

        const { gasUsed, cumulativeGasUsed } = await method.send({ from, gas: gasEstimate });

        if (provider.options.hardfork === "byzantium") {
          assert.strictEqual(gasUsed, gasEstimate - RSCLEAR_REFUND);
        } else if (provider.options.hardfork === "constantinople") {
          // since storage was initially primed to 1 and we call triggerRsclearRefund(), which then
          // sets storage to 0, 15000 gas is added to the refund counter per Constantinople EIP 1283
          assert.strictEqual(gasUsed, gasEstimate - rsclearRefundForUpdatingDirtySlotToZero);
        }
        assert.strictEqual(gasUsed, cumulativeGasUsed);
      }
    );

    it(
      "accounts for Rsclear Refund in gasEstimate when a dirty storage slot's original value " +
        "is not 0 and current value is 0",
      async() => {
        const { accounts, instance, provider } = services;
        const from = accounts[0];
        const options = { from, gas: 5000000 };

        // prime storage by making sure storage is set to 1
        await instance.methods.initialSettingOfX().send(options);

        // updates current value to 0 and new value to be the remaining amount of gas
        const method = instance.methods.triggerRsclearRefundForX();

        const gasEstimate = await method.estimateGas(options);

        const { gasUsed, cumulativeGasUsed } = await method.send({ from, gas: gasEstimate });

        if (provider.options.hardfork === "byzantium") {
          assert.strictEqual(gasUsed, gasEstimate - RSCLEAR_REFUND);
        } else if (provider.options.hardfork === "constantinople") {
          // since storage was initially primed to 1 and we call triggerRsclearRefundForX(), which then
          // resets storage's current value to 0 and 15000 gas is added to the refund counter, and then
          // it replaces x with gasleft, which removes 150000 gas from the refund counter per Constantinople
          // EIP 1283 leaving us with a rsclear refund of 0
          assert.strictEqual(gasUsed, gasEstimate);
        }
        assert.strictEqual(gasUsed, cumulativeGasUsed);
      }
    );

    it("accounts for Rselfdestruct Refund in gasEstimate", async() => {
      const { abi, accounts, bytecode, web3 } = services;
      const from = accounts[0];
      const options = { from, gas: 5000000 };

      const instance = await deployContract(abi, accounts, bytecode, web3);
      await instance.methods.reset().send(options); // prime storage by making sure it is set to 0

      const method = instance.methods.triggerRselfdestructRefund();

      const gasEstimate = await method.estimateGas(options);

      const { gasUsed, cumulativeGasUsed } = await method.send({ from, gas: gasEstimate });

      assert.strictEqual(gasUsed, gasEstimate - RSELFDESTRUCT_REFUND);
      assert.strictEqual(gasUsed, cumulativeGasUsed);
    });

    it("accounts for Rsclear and Rselfdestruct Refunds in gasEstimate", async() => {
      const { abi, accounts, bytecode, provider, web3 } = services;
      const from = accounts[0];

      const instance = await deployContract(abi, accounts, bytecode, web3);
      await instance.methods.reset().send({ from, gas: 5000000 }); // prime storage by making sure it is set to 0

      const method = instance.methods.triggerAllRefunds();

      const gasEstimate = await method.estimateGas({ from });

      const { gasUsed, cumulativeGasUsed } = await method.send({ from, gas: gasEstimate });

      if (provider.options.hardfork === "byzantium") {
        assert.strictEqual(gasUsed, gasEstimate - RSELFDESTRUCT_REFUND - RSCLEAR_REFUND);
      } else if (provider.options.hardfork === "constantinople") {
        // since storage was initially primed to 0 and we call triggerAllRefunds(), which then
        // resets storage back to 0, 19800 gas is added to the refund counter per Constantinople EIP 1283
        assert.strictEqual(
          gasUsed,
          gasEstimate - RSELFDESTRUCT_REFUND - RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO
        );
      }
      assert.strictEqual(gasUsed, cumulativeGasUsed);
    });

    it("accounts for Rsclear & Rselfdestruct Refunds in gasEstimate w/ multiple transactions in the block", async() => {
      const { abi, bytecode, provider } = services;
      const options = {
        blockTime: 0.5, // seconds
        mnemonic
      };
      const { accounts, web3 } = await getWeb3(options);

      const transactions = [
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
      const initialBlockNumber = await web3.eth.getBlockNumber();
      assert.deepStrictEqual(initialBlockNumber, 0, "Current Block Should be 0");

      const localGasInstance = await deployContract(abi, accounts, bytecode, web3);

      // prime storage by making sure it is set to 0
      await localGasInstance.methods.reset().send({ from: accounts[0], gas: 5000000 });
      const method = localGasInstance.methods.triggerAllRefunds();
      const gasEstimate = await method.estimateGas({ from: accounts[0] });

      const hashes = await Promise.all(
        transactions.map((transaction) => {
          const promiEvent = web3.eth.sendTransaction(transaction);

          return new Promise((resolve) => {
            promiEvent.once("transactionHash", async(hash) => {
              // Ensure there's no receipt since the transaction hasn't yet been processed. Ensure IntervalMining
              const receipt = await web3.eth.getTransactionReceipt(hash);
              assert.strictEqual(receipt, null, "No receipt since the transaction hasn't yet been processed.");
              resolve(hash);
            });
          });
        })
      );

      const currentBlockNumber = await web3.eth.getBlockNumber();
      assert.deepStrictEqual(currentBlockNumber, 2, "Current Block Should be 2");

      const receipt = await method.send({ from: accounts[0], gas: gasEstimate });

      let transactionCostMinusRefund = gasEstimate - RSELFDESTRUCT_REFUND - RSCLEAR_REFUND;
      if (provider.options.hardfork === "byzantium") {
        assert.strictEqual(receipt.gasUsed, transactionCostMinusRefund);
      } else if (provider.options.hardfork === "constantinople") {
        // since storage was initially primed to 0 and we call triggerAllRefunds(), which then
        // resets storage back to 0, 19800 gas is added to the refund counter per Constantinople EIP 1283
        transactionCostMinusRefund =
          gasEstimate - RSELFDESTRUCT_REFUND - RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO;
        assert.strictEqual(receipt.gasUsed, transactionCostMinusRefund);
      }

      const receipts = await Promise.all(hashes.map((hash) => web3.eth.getTransactionReceipt(hash)));
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
      const currentBlock = await web3.eth.getBlock(receipts[0].blockNumber);

      // ( Tx3 has a lower nonce -> Tx3 index is < Tx2 index ) -> cumulative gas Tx2 > Tx3 > Tx1
      const isAccumulating =
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

      const totalGas = receipts[0].gasUsed + receipts[1].gasUsed + receipts[2].gasUsed;
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
    });

    it("clears mapping storage slots", async() => {
      const { accounts, instance } = services;
      const options = { from: accounts[0] };

      await instance.methods.reset().send({ from: options.from, gas: 5000000 });

      const uintsa = await instance.methods.uints(1).call();
      assert.strictEqual(uintsa, "0", "initial value is not correct");

      const receipta = await instance.methods.store(1).send(options);
      assert.strictEqual(receipta.status, true, "storing value did not work");

      const uintsb = await instance.methods.uints(1).call();
      assert.strictEqual(uintsb, "1", "set value is incorrect");

      const receiptb = await instance.methods.clear().send(options);
      assert.strictEqual(receiptb.status, true, "clearing value did not work");

      const uintsc = await instance.methods.uints(1).call();
      assert.strictEqual(uintsc, "0", "cleared value is not correct");
    });
  });

  describe("Estimation", () => {
    it("matches estimate for deployment", async() => {
      const { accounts, bytecode, contract } = services;
      const gasEstimate = await contract.deploy({ data: bytecode }).estimateGas({
        from: accounts[1]
      });

      assert.deepStrictEqual(deploymentReceipt.gasUsed, gasEstimate);
      assert.deepStrictEqual(deploymentReceipt.cumulativeGasUsed, gasEstimate);
    });

    it("matches usage for complex function call (add)", async() => {
      const { accounts, instance } = services;
      await testTransactionEstimate(
        instance.methods.add,
        [toBytes("Tim"), toBytes("A great guy"), 10],
        { from: accounts[0], gas: 3141592 },
        instance
      );
    }).timeout(10000);

    it("matches usage for complex function call (transfer)", async() => {
      const { accounts, instance } = services;
      await testTransactionEstimate(
        instance.methods.transfer,
        ["0x0123456789012345678901234567890123456789", 5, toBytes("Tim")],
        { from: accounts[0], gas: 3141592 },
        instance
      );
    }).timeout(10000);

    it("matches usage for simple account to account transfer", async() => {
      const { accounts, web3 } = services;
      const transferAmount = web3.utils.toBN(web3.utils.toWei("5", "finney"));
      const transactionData = {
        from: accounts[0],
        to: accounts[1],
        value: transferAmount
      };

      const gasEstimate = await web3.eth.estimateGas(transactionData);

      const receipt = await web3.eth.sendTransaction(transactionData);

      assert.strictEqual(receipt.gasUsed, gasEstimate);
    });
  });

  describe("Expenditure", () => {
    it("should calculate gas expenses correctly in consideration of the default gasPrice", async() => {
      const { accounts, web3 } = services;
      const gasPrice = await web3.eth.getGasPrice();
      await isGasExpenseCorrect(gasPrice, false, web3, accounts);
    });

    it("should calculate gas expenses correctly in consideration of the requested gasPrice", async() => {
      const { accounts, web3 } = services;
      await isGasExpenseCorrect("0x10000", true, web3, accounts);
    });

    it("should calculate gas expenses correctly in consideration of a user-defined default gasPrice", async() => {
      const gasPrice = "0x2000";
      const options = { mnemonic, gasPrice };
      const { accounts, provider, web3 } = await getWeb3(options);

      try {
        await isGasExpenseCorrect(gasPrice, false, web3, accounts);
      } catch (e) {
        if (web3) {
          web3.setProvider(null);
        }
        provider.stop(() => {});
      }
    });

    it("should calculate cumalativeGas and gasUsed correctly when multiple transactions are in a block", async() => {
      const options = {
        blockTime: 0.5, // seconds
        mnemonic
      };
      const { accounts, web3 } = await getWeb3(options);

      const transactions = [
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
      const initialBlockNumber = await web3.eth.getBlockNumber();
      assert.deepStrictEqual(initialBlockNumber, 0, "Current Block Should be 0");

      const hashes = await Promise.all(
        transactions.map((transaction) => {
          const promiEvent = web3.eth.sendTransaction(transaction);

          return new Promise((resolve) => {
            promiEvent.once("transactionHash", async(hash) => {
              // Ensure there's no receipt since the transaction hasn't yet been processed. Ensure IntervalMining
              const receipt = await web3.eth.getTransactionReceipt(hash);
              assert.strictEqual(receipt, null, "No receipt since the transaction hasn't yet been processed.");

              resolve(hash);
            });
          });
        })
      );

      // Wait .75 seconds (1.5x the mining interval) then get the receipt. It should be processed.
      await sleep(750);

      const currentBlockNumber = await web3.eth.getBlockNumber();
      assert.deepStrictEqual(currentBlockNumber, 1, "Current Block Should be 1");

      const currentBlock = await web3.eth.getBlock(currentBlockNumber);

      const receipts = await Promise.all(hashes.map((hash) => web3.eth.getTransactionReceipt(hash)));

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
      const isAccumulating =
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

      const totalGas = receipts[0].gasUsed + receipts[1].gasUsed + receipts[2].gasUsed;
      assert.deepStrictEqual(
        totalGas,
        receipts[1].cumulativeGasUsed,
        "Total Gas should be equal the final tx.cumulativeGas"
      );
      assert.deepStrictEqual(totalGas, currentBlock.gasUsed, "Total Gas should be equal to the currentBlock.gasUsed");
    });
  });
});
