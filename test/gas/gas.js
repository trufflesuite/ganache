const assert = require("assert");
const sleep = require("../helpers/utils/sleep");
const bootstrap = require("../helpers/contract/bootstrap");
const confirmGasPrice = require("./lib/confirmGasPrice");
const initializeTestProvider = require("../helpers/web3/initializeTestProvider");
const randomInteger = require("../helpers/utils/generateRandomInteger");
const testTransactionEstimate = require("./lib/transactionEstimate");
const toBytesHexString = require("../helpers/utils/toBytesHexString");
const { deploy } = require("../helpers/contract/compileAndDeploy");

const SEED_RANGE = 1000000;
const RSCLEAR_REFUND = 15000;
const RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO = 19800;
const RSELFDESTRUCT_REFUND = 24000;
const HARDFORKS = ["constantinople", "byzantium"];

describe("Gas", function() {
  HARDFORKS.forEach((hardfork) => {
    describe(`Hardfork: ${hardfork.toUpperCase()}`, function() {
      let context;
      const seed = randomInteger(SEED_RANGE);

      before("Setting up web3 and contract", async function() {
        this.timeout(10000);

        const contractRef = {
          contractFiles: ["EstimateGas"],
          contractSubdirectory: "gas"
        };

        const ganacheProviderOptions = {
          seed,
          hardfork
        };

        context = await bootstrap(contractRef, ganacheProviderOptions);
      });

      describe("Refunds", function() {
        it(
          "accounts for Rsclear Refund in gasEstimate when a dirty storage slot is reset and it's original " +
            " value is 0",
          async function() {
            const { accounts, instance, provider } = context;
            const from = accounts[0];
            const options = { from, gas: 5000000 };

            // prime storage by making sure it is set to 0
            await instance.methods.reset().send(options);

            // update storage and then reset it back to 0
            const method = instance.methods.triggerRsclearRefund();

            const gasEstimate = await method.estimateGas(options);

            const receipt = await method.send({ from, gas: gasEstimate });

            switch (provider.options.hardfork) {
              case "byzantium":
                assert.strictEqual(receipt.gasUsed, gasEstimate - RSCLEAR_REFUND);
                break;
              case "constantinople":
                // since storage was initially primed to 0 and we call triggerRsclearRefund(), which then
                // resets storage back to 0, 19800 gas is added to the refund counter per Constantinople EIP 1283
                assert.strictEqual(receipt.gasUsed, gasEstimate - RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO);
                break;
              default:
                throw new Error("Invalid hardfork option: " + provider.options.hardfork);
            }
            assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
          }
        );

        it(
          "accounts for Rsclear Refund in gasEstimate when a dirty storage slot is reset and it's " +
            "original value is not 0",
          async function() {
            const { accounts, instance, provider } = context;
            const from = accounts[0];
            const rsclearRefundForResettingDirtySlotToNonZeroValue = 4800;
            const options = { from, gas: 5000000 };

            await instance.methods.reset().send(options); // prime storage by making sure y is set to 1

            // update storage and then reset it back to 1
            const method = instance.methods.triggerRsclearRefundForY();

            const gasEstimate = await method.estimateGas(options);

            const receipt = await method.send({ from, gas: gasEstimate });

            switch (provider.options.hardfork) {
              case "byzantium":
                // since we are resetting to a non-zero value, there is no gas added to the refund counter here
                assert.strictEqual(receipt.gasUsed, gasEstimate);
                break;
              case "constantinople":
                // since storage was initially primed to 1 and we call triggerRsclearRefundForY(), which then
                // resets storage back to 1, 4800 gas is added to the refund counter per Constantinople EIP 1283
                assert.strictEqual(receipt.gasUsed, gasEstimate - rsclearRefundForResettingDirtySlotToNonZeroValue);
                break;
              default:
                throw new Error("Invalid hardfork option: " + provider.options.hardfork);
            }
            assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
          }
        );

        it(
          "accounts for Rsclear Refund in gasEstimate when a fresh storage slot's original " +
            "value is not 0 and new value is 0",
          async function() {
            const { accounts, instance, provider } = context;
            const from = accounts[0];
            const rsclearRefundForUpdatingFreshSlotToZero = 15000;
            const options = { from, gas: 5000000 };

            // prime storage by making sure storage is set to 1
            await instance.methods.initialSettingOfX().send(options);

            // update storage to be 0
            const method = instance.methods.reset();

            const gasEstimate = await method.estimateGas(options);

            const receipt = await method.send({ from, gas: gasEstimate });

            switch (provider.options.hardfork) {
              case "byzantium":
                assert.strictEqual(receipt.gasUsed, gasEstimate - RSCLEAR_REFUND);
                break;
              case "constantinople":
                // since storage was initially primed to 1 and we call reset(), which then sets
                // storage to 0, 15000 gas is added to the refund counter per Constantinople EIP 1283
                assert.strictEqual(receipt.gasUsed, gasEstimate - rsclearRefundForUpdatingFreshSlotToZero);
                break;
              default:
                throw new Error("Invalid hardfork option: " + provider.options.hardfork);
            }
            assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
          }
        );

        it(
          "accounts for Rsclear Refund in gasEstimate when a dirty storage slot's original value " +
            "is not 0 and new value is 0",
          async function() {
            const { accounts, instance, provider } = context;
            const from = accounts[0];
            const rsclearRefundForUpdatingDirtySlotToZero = 15000;
            const options = { from, gas: 5000000 };

            // prime storage by making sure storage is set to 1
            await instance.methods.initialSettingOfX().send(options);

            // update storage and then reset it to 0
            const method = instance.methods.triggerRsclearRefund();

            const gasEstimate = await method.estimateGas(options);

            const receipt = await method.send({ from, gas: gasEstimate });

            switch (provider.options.hardfork) {
              case "byzantium":
                assert.strictEqual(receipt.gasUsed, gasEstimate - RSCLEAR_REFUND);
                break;
              case "constantinople":
                // since storage was initially primed to 1 and we call triggerRsclearRefund(), which then
                // sets storage to 0, 15000 gas is added to the refund counter per Constantinople EIP 1283
                assert.strictEqual(receipt.gasUsed, gasEstimate - rsclearRefundForUpdatingDirtySlotToZero);
                break;
              default:
                throw new Error("Invalid hardfork option: " + provider.options.hardfork);
            }
            assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
          }
        );

        it(
          "accounts for Rsclear Refund in gasEstimate when a dirty storage slot's original value " +
            "is not 0 and current value is 0",
          async function() {
            const { accounts, instance, provider } = context;
            const from = accounts[0];
            const options = { from, gas: 5000000 };

            // prime storage by making sure storage is set to 1
            await instance.methods.initialSettingOfX().send(options);

            // updates current value to 0 and new value to be the remaining amount of gas
            const method = instance.methods.triggerRsclearRefundForX();

            const gasEstimate = await method.estimateGas(options);

            const receipt = await method.send({ from, gas: gasEstimate });

            switch (provider.options.hardfork) {
              case "byzantium":
                assert.strictEqual(receipt.gasUsed, gasEstimate - RSCLEAR_REFUND);
                break;
              case "constantinople":
                // since storage was initially primed to 1 and we call triggerRsclearRefundForX(), which then
                // resets storage's current value to 0 and 15000 gas is added to the refund counter, and then
                // it replaces x with gasleft, which removes 150000 gas from the refund counter per Constantinople
                // EIP 1283 leaving us with a rsclear refund of 0
                assert.strictEqual(receipt.gasUsed, gasEstimate);
                break;
              default:
                throw new Error("Invalid hardfork option: " + provider.options.hardfork);
            }
            assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
          }
        );

        it("accounts for Rselfdestruct Refund in gasEstimate", async function() {
          const { abi, accounts, bytecode, web3 } = context;
          const from = accounts[0];
          const options = { from, gas: 5000000 };

          const deploymentOptions = { gas: 3141592 };
          const { instance } = await deploy(abi, bytecode, web3, deploymentOptions);
          await instance.methods.reset().send(options); // prime storage by making sure it is set to 0

          const method = instance.methods.triggerRselfdestructRefund();

          const gasEstimate = await method.estimateGas(options);

          const receipt = await method.send({ from, gas: gasEstimate });

          assert.strictEqual(receipt.gasUsed, gasEstimate - RSELFDESTRUCT_REFUND);
          assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
        });

        it("accounts for Rsclear and Rselfdestruct Refunds in gasEstimate", async function() {
          const { abi, accounts, bytecode, provider, web3 } = context;
          const from = accounts[0];

          const deploymentOptions = { gas: 3141592 };
          const { instance } = await deploy(abi, bytecode, web3, deploymentOptions);
          await instance.methods.reset().send({ from, gas: 5000000 }); // prime storage by making sure it is set to 0

          const method = instance.methods.triggerAllRefunds();

          const gasEstimate = await method.estimateGas({ from });

          const receipt = await method.send({ from, gas: gasEstimate });

          switch (provider.options.hardfork) {
            case "byzantium":
              assert.strictEqual(receipt.gasUsed, gasEstimate - RSELFDESTRUCT_REFUND - RSCLEAR_REFUND);
              break;
            case "constantinople":
              // since storage was initially primed to 0 and we call triggerAllRefunds(), which then
              // resets storage back to 0, 19800 gas is added to the refund counter per Constantinople EIP 1283
              assert.strictEqual(
                receipt.gasUsed,
                gasEstimate - RSELFDESTRUCT_REFUND - RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO
              );
              break;
            default:
              throw new Error("Invalid hardfork option: " + provider.options.hardfork);
          }
          assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
        });

        // Unskip this test once byzantium passes
        it("account Rsclear/Rselfdestruct/Refunds in gasEstimate w/many transactions in a block", async function() {
          const { abi, bytecode, provider } = context;
          const options = {
            blockTime: 0.5, // seconds
            seed,
            hardfork
          };
          const { accounts, web3 } = await initializeTestProvider(options);

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

          const deploymentOptions = { gas: 3141592 };
          const { instance } = await deploy(abi, bytecode, web3, deploymentOptions);

          // prime storage by making sure it is set to 0
          await instance.methods.reset().send({ from: accounts[0], gas: 5000000 });
          const method = instance.methods.triggerAllRefunds();
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

          const { gasUsed } = await method.send({ from: accounts[0], gas: gasEstimate });

          let transactionCostMinusRefund = gasEstimate - RSELFDESTRUCT_REFUND - RSCLEAR_REFUND;
          switch (provider.options.hardfork) {
            case "byzantium":
              assert.strictEqual(gasUsed, transactionCostMinusRefund);
              break;
            case "constantinople":
              // since storage was initially primed to 0 and we call triggerAllRefunds(), which then
              // resets storage back to 0, 19800 gas is added to the refund counter per Constantinople EIP 1283
              transactionCostMinusRefund =
                gasEstimate - RSELFDESTRUCT_REFUND - RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO;
              assert.strictEqual(gasUsed, transactionCostMinusRefund);
              break;
            default:
              throw new Error("Invalid hardfork option: " + provider.options.hardfork);
          }

          const receipt = await Promise.all(hashes.map((hash) => web3.eth.getTransactionReceipt(hash)));
          assert.deepStrictEqual(receipt[0].gasUsed, receipt[1].gasUsed, "Tx1 and Tx2 should cost the same gas.");
          assert.deepStrictEqual(
            receipt[1].gasUsed,
            receipt[2].gasUsed,
            "Tx2 and Tx3 should cost the same gas. -> Tx1 gas === Tx3 gas Transitive"
          );
          assert.deepStrictEqual(
            receipt[1].transactionIndex > receipt[2].transactionIndex,
            true,
            "(Tx3 has a lower nonce) -> (Tx3 index is < Tx2 index)"
          );
          const currentBlock = await web3.eth.getBlock(receipt[0].blockNumber);

          // ( Tx3 has a lower nonce -> Tx3 index is < Tx2 index ) -> cumulative gas Tx2 > Tx3 > Tx1
          const isAccumulating =
            receipt[1].cumulativeGasUsed > receipt[2].cumulativeGasUsed &&
            receipt[2].cumulativeGasUsed > receipt[0].cumulativeGasUsed;

          assert.deepStrictEqual(
            isAccumulating,
            true,
            "Cumulative gas should be accumulating for any transactions in the same block."
          );

          assert.deepStrictEqual(
            receipt[0].gasUsed,
            receipt[0].cumulativeGasUsed,
            "Gas and cumulative gas should be equal for the FIRST Tx."
          );

          assert.notDeepStrictEqual(
            receipt[1].gasUsed,
            receipt[1].cumulativeGasUsed,
            "Gas and cumulative gas should NOT be equal for the Second Tx."
          );

          assert.notDeepStrictEqual(
            receipt[2].gasUsed,
            receipt[2].cumulativeGasUsed,
            "Gas and cumulative gas should NOT be equal for the Third Tx."
          );

          const totalGas = receipt[0].gasUsed + receipt[1].gasUsed + receipt[2].gasUsed;
          assert.deepStrictEqual(
            totalGas + transactionCostMinusRefund,
            receipt[1].cumulativeGasUsed,
            "Total Gas should equal the final tx.cumulativeGas"
          );

          assert.deepStrictEqual(
            totalGas + transactionCostMinusRefund,
            currentBlock.gasUsed,
            "Total Gas should be equal to the currentBlock.gasUsed"
          );
        });

        it("clears mapping storage slots", async function() {
          const { accounts, instance } = context;
          const from = accounts[0];
          const options = { from };

          await instance.methods.reset().send({ from, gas: 5000000 });

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

      describe("Estimation", function() {
        it("matches estimate for deployment", async function() {
          const { accounts, bytecode, contract, receipt } = context;
          const gasEstimate = await contract.deploy({ data: bytecode }).estimateGas({
            from: accounts[1]
          });

          assert.deepStrictEqual(receipt.gasUsed, gasEstimate);
          assert.deepStrictEqual(receipt.cumulativeGasUsed, gasEstimate);
        });

        it("matches usage for complex function call (add)", async function() {
          const { accounts, instance } = context;
          await testTransactionEstimate(
            instance.methods.add,
            [toBytesHexString("Tim"), toBytesHexString("A great guy"), 10],
            { from: accounts[0], gas: 3141592 },
            instance
          );
        }).timeout(10000);

        it("matches usage for complex function call (transfer)", async function() {
          const { accounts, instance } = context;
          await testTransactionEstimate(
            instance.methods.transfer,
            ["0x0123456789012345678901234567890123456789", 5, toBytesHexString("Tim")],
            { from: accounts[0], gas: 3141592 },
            instance
          );
        }).timeout(10000);

        it("matches usage for simple account to account transfer", async function() {
          const { accounts, web3 } = context;
          const transferAmount = web3.utils.toBN(web3.utils.toWei("5", "finney"));
          const transactionData = {
            from: accounts[0],
            to: accounts[1],
            value: transferAmount
          };

          const web3Transactions = [
            await web3.eth.estimateGas(transactionData),
            await web3.eth.sendTransaction(transactionData)
          ];
          const [gasEstimate, receipt] = await Promise.all(web3Transactions);

          assert.strictEqual(receipt.gasUsed, gasEstimate);
        });
      });

      describe("Expenditure", function() {
        it("should calculate gas expenses correctly in consideration of the default gasPrice", async function() {
          const { accounts, web3 } = context;
          const transferAmount = "500";
          const gasPrice = await web3.eth.getGasPrice();
          await confirmGasPrice(gasPrice, false, web3, accounts, transferAmount);
        });

        it("should calculate gas expenses correctly in consideration of the requested gasPrice", async function() {
          const transferAmount = "500";
          const gasPrice = "0x10000";
          const { accounts, web3 } = context;
          await confirmGasPrice(gasPrice, true, web3, accounts, transferAmount);
        });

        it("should calculate gas expenses correctly with a user-defined default gasPrice", async function() {
          const transferAmount = "500";
          const gasPrice = "0x2000";
          const options = { seed, gasPrice };
          const { accounts, web3 } = await initializeTestProvider(options);
          await confirmGasPrice(gasPrice, false, web3, accounts, transferAmount);
        });

        it("should calculate cumalativeGas and gasUsed correctly for many transactions in a block", async function() {
          const options = {
            blockTime: 0.5, // seconds
            seed
          };
          const { accounts, web3 } = await initializeTestProvider(options);

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

          const receipt = await Promise.all(hashes.map((hash) => web3.eth.getTransactionReceipt(hash)));

          assert.deepStrictEqual(receipt[0].gasUsed, receipt[1].gasUsed, "Tx1 and Tx2 should cost the same gas.");
          assert.deepStrictEqual(
            receipt[1].gasUsed,
            receipt[2].gasUsed,
            "Tx2 and Tx3 should cost the same gas. -> Tx1 gas === Tx3 gas Transitive"
          );
          assert.deepStrictEqual(
            receipt[1].transactionIndex > receipt[2].transactionIndex,
            true,
            "(Tx3 has a lower nonce) -> (Tx3 index is < Tx2 index)"
          );

          // ( Tx3 has a lower nonce -> Tx3 index is < Tx2 index ) -> cumulative gas Tx2 > Tx3 > Tx1
          const isAccumulating =
            receipt[1].cumulativeGasUsed > receipt[2].cumulativeGasUsed &&
            receipt[2].cumulativeGasUsed > receipt[0].cumulativeGasUsed;
          assert.deepStrictEqual(
            isAccumulating,
            true,
            "Cumulative gas should be accumulating for any transactions in the same block."
          );
          assert.deepStrictEqual(
            receipt[0].gasUsed,
            receipt[0].cumulativeGasUsed,
            "Gas and cumulative gas should be equal for the FIRST Tx."
          );
          assert.notDeepStrictEqual(
            receipt[1].gasUsed,
            receipt[1].cumulativeGasUsed,
            "Gas and cumulative gas should NOT be equal for the Second Tx."
          );
          assert.notDeepStrictEqual(
            receipt[2].gasUsed,
            receipt[2].cumulativeGasUsed,
            "Gas and cumulative gas should NOT be equal for the Third Tx."
          );

          const totalGas = receipt[0].gasUsed + receipt[1].gasUsed + receipt[2].gasUsed;
          assert.deepStrictEqual(
            totalGas,
            receipt[1].cumulativeGasUsed,
            "Total Gas should be equal the final tx.cumulativeGas"
          );
          assert.deepStrictEqual(
            totalGas,
            currentBlock.gasUsed,
            "Total Gas should be equal to the currentBlock.gasUsed"
          );
        });
      });
    });
  });
});
