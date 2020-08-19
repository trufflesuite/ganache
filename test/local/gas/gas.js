const memdown = require("memdown");
const assert = require("assert");
const bootstrap = require("../../helpers/contract/bootstrap");
const confirmGasPrice = require("./lib/confirmGasPrice");
const initializeTestProvider = require("../../helpers/web3/initializeTestProvider");
const randomInteger = require("../../helpers/utils/generateRandomInteger");
const testTransactionEstimate = require("./lib/transactionEstimate");
const toBytesHexString = require("../../helpers/utils/toBytesHexString");
const { deploy } = require("../../helpers/contract/compileAndDeploy");
const { BN } = require("ethereumjs-util");
const compile = require("../../helpers/contract/singleFileCompile");
const createSignedTx = require("../../helpers/utils/create-signed-tx");
const SEED_RANGE = 1000000;
const RSCLEAR_REFUND = 15000;
const RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO_ISTANBUL = 19200;
const RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO = 19800;
const RSELFDESTRUCT_REFUND = 24000;
const HARDFORKS = ["byzantium", "constantinople", "petersburg", "istanbul", "muirGlacier"];

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

        context = await bootstrap(contractRef, ganacheProviderOptions, hardfork);
      });

      describe("EIP150 Gas Estimation: ", function() {
        const privateKey = Buffer.from("4646464646464646464646464646464646464646464646464646464646464646", "hex");
        let ContractFactory;
        let TestDepth;
        let Donation;
        let Fib;
        let SendContract;
        let Create2;
        let NonZero;
        before("Setting up EIP150 contracts", async function() {
          this.timeout(10000);

          const subDirectory = { contractSubdirectory: "gas" };
          const create2 = Object.assign({ contractFiles: ["CreateTwo", "GasLeft"] }, subDirectory);
          const factory = Object.assign({ contractFiles: ["ContractFactory"] }, subDirectory);
          const testDepth = Object.assign({ contractFiles: ["TestDepth"] }, subDirectory);
          const donation = Object.assign({ contractFiles: ["Donation"] }, subDirectory);
          const fib = Object.assign({ contractFiles: ["Fib"] }, subDirectory);
          const sendContract = Object.assign({ contractFiles: ["SendContract"] }, subDirectory);
          const nonZero = Object.assign({ contractFiles: ["NonZero"] }, subDirectory);

          const ganacheProviderOptions = {
            seed,
            hardfork
          };

          ContractFactory = await bootstrap(factory, ganacheProviderOptions, hardfork);
          // memdown makes the test that uses TestDepth about 20% faster, so we use it here because CI makes us sad.
          TestDepth = await bootstrap(testDepth, Object.assign({ db: memdown() }, ganacheProviderOptions), hardfork);
          Donation = await bootstrap(donation, ganacheProviderOptions, hardfork);
          Fib = await bootstrap(fib, ganacheProviderOptions, hardfork);
          NonZero = await bootstrap(nonZero, ganacheProviderOptions, hardfork);
          SendContract = await bootstrap(
            sendContract,
            Object.assign(
              {
                accounts: [
                  {
                    secretKey: "0x" + privateKey.toString("hex"),
                    balance: "0x" + new BN("1000000000000000000000").toString("hex")
                  }
                ]
              },
              ganacheProviderOptions
            ),
            hardfork
          );
          if (hardfork !== "byzantium") {
            Create2 = await bootstrap(create2, ganacheProviderOptions, hardfork);
          }
        });

        it("Should not timeout when running a long test", async() => {
          try {
            await context.instance.methods.runsOutOfGas().send({ from: context.accounts[0] });
            assert.fail();
          } catch (e) {
            assert(e.message.includes("out of gas"));
          }
        }).timeout(5000);

        it("Should estimate gas perfectly with EIP150 - recursive CALL", async() => {
          const { accounts, instance, send } = Fib;
          const txParams = {
            from: accounts[0],
            to: instance._address,
            value: 10
          };
          const { result: estimateHex } = await send("eth_estimateGas", txParams);
          const estimate = parseInt(estimateHex);
          const tx = Object.assign({ gas: `0x${(estimate - 1).toString(16)}` }, txParams);
          await assert.rejects(
            () => send("eth_sendTransaction", tx),
            {
              message: "VM Exception while processing transaction: out of gas"
            },
            `SANITY CHECK: Gas estimate: ${estimate - 1} is too high.`
          );
          tx.gas = estimateHex;
          await assert.doesNotReject(
            () => send("eth_sendTransaction", tx),
            undefined,
            `SANITY CHECK. Still not enough gas? ${estimate} Our estimate is still too low`
          );
        });

        it("Should estimate gas perfectly with EIP150 - CREATE", async() => {
          const { accounts, instance, send } = ContractFactory;
          const txParams = {
            from: accounts[0],
            to: instance._address,
            data: instance.methods.createInstance().encodeABI()
          };
          const { result: estimateHex } = await send("eth_estimateGas", txParams);
          const estimate = new BN(estimateHex.substring(2), "hex");
          txParams.gas = "0x" + estimate.subn(1).toString("hex");
          await assert.rejects(() => send("eth_sendTransaction", txParams), {
            message: "VM Exception while processing transaction: revert"
          });

          txParams.gas = estimateHex;
          await assert.doesNotReject(
            () => send("eth_sendTransaction", txParams),
            undefined,
            `SANITY CHECK. Still not enough gas? ${estimate} Our estimate is still too low`
          );
        });

        it("Should estimate gas perfectly with EIP150 - CALL INSIDE CREATE", async() => {
          const { accounts, instance } = Donation;
          // Pre-condition
          const address = accounts[0];
          const donateTx = { from: address, value: 50 };
          donateTx.gas = await instance.methods.donate().estimateGas(donateTx);
          await instance.methods.donate().send(donateTx);
          const tx = { from: address };
          const est = await instance.methods.moveFund(address, 5).estimateGas(tx);
          tx.gas = est - 1;
          await assert.rejects(() => instance.methods.moveFund(address, 5).send(tx), {
            message: "VM Exception while processing transaction: out of gas"
          });
          tx.gas = est;
          await assert.doesNotReject(
            () => instance.methods.moveFund(address, 5).send(tx),
            undefined,
            `SANITY CHECK. Still not enough gas? ${est} Our estimate is still too low`
          );
        }).timeout(1000000);

        if (hardfork !== "byzantium") {
          it("Should estimate gas perfectly with EIP150 - DELEGATECALL", async() => {
            const { accounts, instance } = TestDepth;
            const depth = 3;
            const promises = Array(depth)
              .fill(0)
              .map((_, i) => {
                const depth = i + 1;
                return instance.methods
                  .depth(depth)
                  .estimateGas()
                  .then(async(est) => {
                    return Promise.all([
                      assert.doesNotReject(
                        instance.methods.depth(depth).send({
                          from: accounts[5],
                          gas: est
                        }),
                        undefined,
                        `SANITY CHECK. Still not enough gas? ${est} Our estimate is still too low`
                      ),
                      assert.rejects(
                        instance.methods.depth(depth).send({
                          from: accounts[5],
                          gas: est - 1
                        }),
                        {
                          name: "RuntimeError"
                        }
                      )
                    ]);
                  });
              });
            await Promise.all(promises);
          }).timeout(3000);

          it("Should estimate gas perfectly with EIP150 - CREATE2", async() => {
            const { accounts, instance, web3 } = Create2;
            const { result: newContract } = compile("./test/contracts/gas/", "GasLeft");
            const bytecode = newContract.contracts["GasLeft.sol"].GasLeft.evm.bytecode.object;
            const byteCode = `0x${bytecode}${web3.eth.abi.encodeParameter("address", accounts[0]).slice(2)}`;
            const salt = `0x${"0".repeat(63)}1`;
            const futureAddress = `0x${web3.utils
              .sha3(
                `0x${["ff", instance._address, salt, web3.utils.sha3(byteCode)]
                  .map((val) => val.replace(/0x/, ""))
                  .join("")}`
              )
              .slice(-40)}`.toLowerCase();
            const codeCheck = await web3.eth.getCode(futureAddress);
            assert(codeCheck.slice(2).length === 0, "contract should not be deployed on chain!");

            const nonce = await web3.eth.getTransactionCount(accounts[0]);
            const result = await instance.methods.deploy(byteCode, salt).send({
              from: accounts[0],
              gas: 4500000,
              gasPrice: 10000000000,
              nonce
            });

            const addr = result.events.RelayAddress.returnValues.addr;
            assert(addr, futureAddress, "future contract address not the same as computed value");
            const codeCheck2 = await web3.eth.getCode(futureAddress);
            assert(codeCheck2.slice(2).length > 0, "contract should be deployed on chain!");
          }).timeout(1000000);

          // TODO: Make this actually test SVT
          it("Should estimate gas perfectly with EIP150 - Simple Value Transfer", async() => {
            const { accounts, instance, send, web3 } = SendContract;
            const toBN = (hex) => new BN(hex.substring(2), "hex");
            const toBNStr = (hex, base = 10) => toBN(hex).toString(base);
            const sign = createSignedTx(privateKey);
            const gasPrice = "0x77359400";
            const amountToTransfer = "0xfffffff1ff000000";

            // Get initial Balance after contract deploy
            const { result: balance } = await send("eth_getBalance", accounts[0]);

            // Initial seeding of capital to contract, we check the balance after.
            const tx = {
              gasPrice,
              value: amountToTransfer, // ~18 ether
              from: accounts[0],
              to: instance._address
            };
            ({ result: tx.gasLimit } = await send("eth_estimateGas", tx));
            const { result: hash } = await send("eth_sendTransaction", tx);
            const {
              result: { gasUsed: initialGasUsed }
            } = await send("eth_getTransactionReceipt", hash);

            // Assert that the contract has the correct balance ~18 ether
            const getBalance = await instance.methods.getBalance().call({ from: accounts[0] });
            assert.strictEqual(toBNStr(amountToTransfer), getBalance, "balance is not ~18 ether");

            // It's not neccessary to sign but currently it's the only test that demonstrates sending signed
            // transactions that call a contract method.
            // Calling `encodeABI()` on the desired contract method will return the
            // the necessary bytecode to call the contract method with the given parameters
            // NOTE: errors from encodeABI are likely do to incorrect types for the method arguments
            // Double check the contracts method signature and your arguments
            // Ex: transfer(Address[], uint))  =>  transfer(Array, hex string of int)
            const txParams = {
              gasPrice,
              nonce: "0x2",
              to: instance._address,
              value: "0x0",
              data: instance.methods.transfer(accounts, amountToTransfer).encodeABI()
            };
            ({ result: txParams.gasLimit } = await send("eth_estimateGas", sign(txParams).serialize()));
            const { gasUsed: signedGasUsed } = await web3.eth.sendSignedTransaction(sign(txParams).serialize());
            const { result: newBalance } = await send("eth_getBalance", accounts[0]);
            // Gasprice * ( sum of gas used )
            const gas = toBN(gasPrice).mul(toBN(initialGasUsed).addn(signedGasUsed));
            // Our current balance, plus the wei spent on gas === original gas
            const currentBalancePlusGas = toBN(newBalance)
              .add(gas)
              .toString();
            assert.strictEqual(toBNStr(balance), currentBalancePlusGas, "balance + gas used !== to start balance");

            // Assert that signed tx successfully drains contract to address
            const newContractBalance = await instance.methods.getBalance().call({ from: accounts[0] });
            assert.strictEqual(newContractBalance, "0", "balance is not 0");
          }).timeout(10000);
        }

        it("should correctly handle non-zero value child messages", async() => {
          const {
            accounts: [from],
            instance: { _address: to, methods },
            send
          } = NonZero;
          const fns = [methods.doSend, methods.doTransfer, methods.doCall];
          for (let i = 0, l = fns; i < l.length; i++) {
            const tx = {
              from,
              to,
              value: "1000000000000000000",
              data: fns[i]().encodeABI()
            };
            const { result: gasLimit } = await send("eth_estimateGas", tx);
            tx.gasLimit = "0x" + (parseInt(gasLimit) - 1).toString(16);
            await assert.rejects(() => send("eth_sendTransaction", tx), {
              message: "VM Exception while processing transaction: out of gas"
            });
            tx.gasLimit = gasLimit;
            await assert.doesNotReject(
              () => send("eth_sendTransaction", tx),
              undefined,
              `SANITY CHECK. Still not enough gas? ${gasLimit} Our estimate is still too low`
            );
          }
        });
      });

      describe("Refunds", function() {
        it(
          "accounts for Rsclear Refund in gasEstimate when a dirty storage slot is reset and it's original " +
            "value is 0",
          async function() {
            const { accounts, instance, provider } = context;
            const from = accounts[0];
            const options = { from, gas: 5000000 };

            // prime storage by making sure it is set to 0
            await instance.methods.reset().send(options);

            // update storage and then reset it back to 0
            const method = instance.methods.triggerRsclearRefund();

            const estimate = await method.estimateGas(options);

            const receipt = await method.send({ from, gas: estimate });

            switch (provider.options.hardfork) {
              case "byzantium":
              case "petersburg":
                assert.strictEqual(receipt.gasUsed, estimate - RSCLEAR_REFUND);
                break;
              case "muirGlacier":
              case "istanbul":
                // EIP-2200
                assert(receipt.gasUsed <= estimate - RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO_ISTANBUL + 2300);
                break;
              case "constantinople":
                // since storage was initially primed to 0 and we call triggerRsclearRefund(), which then
                // resets storage back to 0, 19800 gas is added to the refund counter per Constantinople EIP 1283
                assert.strictEqual(receipt.gasUsed, estimate - RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO);
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
            const rsclearRefundForResettingDirtySlotToNonZeroValueIstanbul = 4200;
            const options = { from, gas: 5000000 };

            await instance.methods.reset().send(options); // prime storage by making sure y is set to 1

            // update storage and then reset it back to 1
            const method = instance.methods.triggerRsclearRefundForY();

            const gasEstimate = await method.estimateGas(options);

            const receipt = await method.send({ from, gas: gasEstimate });

            switch (provider.options.hardfork) {
              case "byzantium":
              case "petersburg":
                // since we are resetting to a non-zero value, there is no gas added to the refund counter here
                assert.strictEqual(receipt.gasUsed, gasEstimate);
                break;
              case "muirGlacier":
              case "istanbul": // EIP-2200
                assert(
                  receipt.gasUsed <= gasEstimate - rsclearRefundForResettingDirtySlotToNonZeroValueIstanbul + 2300
                );
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
            const options = { from, gas: 5000000 };

            // prime storage by making sure storage is set to 1
            await instance.methods.initialSettingOfX().send(options);

            // update storage to be 0
            const method = instance.methods.reset();

            const gasEstimate = await method.estimateGas(options);

            const receipt = await method.send({ from, gas: gasEstimate });

            switch (provider.options.hardfork) {
              case "byzantium":
              case "petersburg":
              case "constantinople":
                assert.strictEqual(receipt.gasUsed, gasEstimate - RSCLEAR_REFUND);
                break;
              case "muirGlacier":
              case "istanbul": // EIP-2200
                assert(receipt.gasUsed <= gasEstimate - RSCLEAR_REFUND + 2300);
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
            const options = { from, gas: 5000000 };

            // prime storage by making sure storage is set to 1
            await instance.methods.initialSettingOfX().send(options);

            // update storage and then reset it to 0
            const method = instance.methods.triggerRsclearRefund();

            const gasEstimate = await method.estimateGas(options);

            const receipt = await method.send({ from, gas: gasEstimate });

            switch (provider.options.hardfork) {
              case "byzantium":
              case "petersburg":
              case "constantinople":
                assert.strictEqual(receipt.gasUsed, gasEstimate - RSCLEAR_REFUND);
                break;
              case "muirGlacier":
              case "istanbul": // EIP-2200
                assert(receipt.gasUsed <= gasEstimate - RSCLEAR_REFUND + 2300);
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
              case "petersburg":
                assert.strictEqual(receipt.gasUsed, gasEstimate - RSCLEAR_REFUND);
                break;
              case "muirGlacier":
              case "istanbul":
                assert(receipt.gasUsed <= gasEstimate + 2300);
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
            case "petersburg":
              assert.strictEqual(receipt.gasUsed, gasEstimate - RSELFDESTRUCT_REFUND - RSCLEAR_REFUND);
              break;
            case "muirGlacier":
            case "istanbul": // EIP-2200
              assert.strictEqual(
                receipt.gasUsed,
                gasEstimate - RSELFDESTRUCT_REFUND - RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO_ISTANBUL
              );
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

        it("account Rsclear/Rselfdestruct/Refunds in gasEstimate w/many transactions in a block", async function() {
          const { abi, bytecode, provider } = context;
          const options = {
            seed,
            hardfork
          };
          const { send, accounts, web3 } = await initializeTestProvider(options);

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
          await send("miner_stop");
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

          const method = instance.methods.triggerAllRefunds();
          const gasEstimate = await method.estimateGas({ from: accounts[0] });
          const prom = method.send({ from: accounts[0], gas: gasEstimate });
          await new Promise((resolve) => {
            prom.once("transactionHash", resolve);
          });
          await send("evm_mine");
          // web3 doesn't subscribe fast enough to newHeads after issuing the previous send
          // we we mine another block to give it an additional newHeads notification. /shrug
          await send("evm_mine");
          const rec = await prom;
          const { gasUsed } = rec;

          let transactionCostMinusRefund = gasEstimate - RSELFDESTRUCT_REFUND - RSCLEAR_REFUND;
          switch (provider.options.hardfork) {
            case "byzantium":
            case "petersburg":
              assert.strictEqual(gasUsed, transactionCostMinusRefund);
              break;
            case "muirGlacier":
            case "istanbul":
              // EIP-2200
              transactionCostMinusRefund =
                gasEstimate - RSELFDESTRUCT_REFUND - RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO_ISTANBUL;
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
      }).timeout(4000);

      describe("Estimation", function() {
        it("matches estimate for deployment", async function() {
          const { accounts, bytecode, contract, receipt } = context;
          const gasEstimate = await contract.deploy({ data: bytecode }).estimateGas({
            from: accounts[1]
          });

          assert.deepStrictEqual(receipt.gasUsed, gasEstimate);
          assert.deepStrictEqual(receipt.cumulativeGasUsed, gasEstimate);
        }).timeout(4000);

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
          const { send, accounts, web3 } = await initializeTestProvider(options);
          await send("miner_stop");

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

          await send("evm_mine");

          const currentBlockNumber = await web3.eth.getBlockNumber();
          assert.deepStrictEqual(currentBlockNumber, 1, "Current Block Should be 1");

          const [currentBlock, receipt] = await Promise.all([
            web3.eth.getBlock(currentBlockNumber),
            Promise.all(hashes.map((hash) => web3.eth.getTransactionReceipt(hash)))
          ]);

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
        }).timeout(4000);
      });
    });
  });
});
