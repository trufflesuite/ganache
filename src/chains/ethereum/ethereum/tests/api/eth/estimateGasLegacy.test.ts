import { EthereumProviderOptions, Hardfork } from "@ganache/ethereum-options";
import { EthereumProvider } from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import compile, { CompileOutput, EVMVersion } from "../../helpers/compile";
import { join } from "path";
import { readdirSync, readFileSync } from "fs";
import { Transaction } from "@ganache/ethereum-transaction";
import { keccak, Quantity } from "@ganache/utils";
import assert from "assert";

// const memdown = require("memdown");
// const bootstrap = require("../../helpers/contract/bootstrap");
// const confirmGasPrice = require("./lib/confirmGasPrice");
// const initializeTestProvider = require("../../helpers/web3/initializeTestProvider");
// const randomInteger = require("../../helpers/utils/generateRandomInteger");
// const testTransactionEstimate = require("./lib/transactionEstimate");
// const toBytesHexString = require("../../helpers/utils/toBytesHexString");
// const { deploy } = require("../../helpers/contract/compileAndDeploy");
// const { BN } = require("ethereumjs-util");
// const createSignedTx = require("../../helpers/utils/create-signed-tx");
// const SEED_RANGE = 1000000;
const RSCLEAR_REFUND = 15000n;
const RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO_ISTANBUL = 19200n;
const RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO = 19800n;
const RSELFDESTRUCT_REFUND = 24000n;
const HARDFORKS: Hardfork[] = [
  "byzantium",
  "constantinople",
  "petersburg",
  "istanbul",
  "muirGlacier",
  "berlin",
  "london",
  "arrowGlacier",
  "grayGlacier",
  "merge"
];

// some contracts can't be compiled with the default hardfork version.
// put the alternatives here
const CONTRACT_EVM_VERSIONS: { [contract: string]: EVMVersion } = {
  "Fib.sol": "byzantium",
  "ContractFactory.sol": "byzantium",
  "Donation.sol": "byzantium",
  "EstimateGas.sol": "byzantium"
};

const encodeValue = (val: number | string) => {
  return Quantity.toBuffer(val).toString("hex").padStart(64, "0");
};

describe("api", () => {
  describe("eth", () => {
    describe.only("estimateGas", function () {
      HARDFORKS.forEach(hardfork => {
        describe(`hardfork: ${hardfork.toUpperCase()}`, function () {
          let provider: EthereumProvider;
          let from: string, to: string;
          let contracts: Map<
            string,
            {
              address: string;
              [methodName: string]: string;
            }
          > = new Map();
          let contractData: {
            contractName: string;
            contract: CompileOutput;
          }[] = [];
          const contractDir = join(__dirname, "contracts/gas-estimation");

          const compileAll = (contractName: string) => {
            const evmVersion = CONTRACT_EVM_VERSIONS[contractName];
            const contract = compile(join(contractDir, contractName), {
              evmVersion
            });
            contractData.push({ contractName, contract });
          };

          const deployContracts = async () => {
            for (const { contractName, contract } of contractData) {
              const id = await provider.send("eth_subscribe", ["newHeads"]);

              const transactionHash = await provider.send(
                "eth_sendTransaction",
                [
                  {
                    from,
                    data: contract.code,
                    gas: "0xffffff"
                  }
                ]
              );

              await provider.once("message");

              const receipt = await provider.send("eth_getTransactionReceipt", [
                transactionHash
              ]);
              await provider.send("eth_unsubscribe", [id]);
              contracts.set(contractName, {
                address: receipt.contractAddress,
                ...contract.contract.evm.methodIdentifiers
              });
            }
          };

          const sendAndGetReceipt = async (transaction: Transaction) => {
            const id = await provider.send("eth_subscribe", ["newHeads"]);

            const hash = await provider.send("eth_sendTransaction", [
              transaction
            ]);
            await provider.once("message");
            await provider.send("eth_unsubscribe", [id]);
            const receipt = await provider.send("eth_getTransactionReceipt", [
              hash
            ]);
            return receipt;
          };
          before("compile all contracts", async () => {
            readdirSync(contractDir).forEach(file => {
              compileAll(file);
            });
          });
          beforeEach("setting up provider", async () => {
            const options: EthereumProviderOptions = {
              chain: { hardfork, vmErrorsOnRPCResponse: true }
            };

            provider = await getProvider(options);
            [from, to] = await provider.send("eth_accounts");
          });
          beforeEach("deploying contracts", async function () {
            this.timeout(0);
            await deployContracts();
          });

          describe("EIP150 Gas Estimation: ", function () {
            // it("Should not timeout when running a long test", async () => {
            //   const contract = contracts.get("EstimateGas.sol");
            //   const transaction = {
            //     from,
            //     to: contract.address,
            //     data: contract.runsOutOfGas
            //   };
            //   try {
            //     sendAndAwait(transaction);
            //   } catch (err) {
            //     console.log(err);
            //   }
            //   await assert.rejects(sendAndAwait(transaction), {
            //     message: "VM Exception while processing transaction: out of gas"
            //   });
            // });

            it("Should estimate gas perfectly with EIP150 - recursive CALL", async () => {
              const contract = contracts.get("Fib.sol");
              const tx1 = {
                from,
                to: contract.address,
                value: "0x10"
              };

              const estimate = await provider.send("eth_estimateGas", [tx1]);
              const oneLess = Quantity.toBigInt(estimate) - 1n;
              const tx2 = {
                gas: Quantity.toString(oneLess),
                from,
                to: contract.address,
                value: "0x10"
              };

              await assert.rejects(
                sendAndGetReceipt(tx2),
                {
                  message:
                    "VM Exception while processing transaction: out of gas"
                },
                `One less gas than estimated should have failed. One less was ${oneLess}`
              );

              const tx3 = {
                gas: estimate,
                from,
                to: contract.address,
                value: "0x10"
              };
              const receipt = await sendAndGetReceipt(tx3);
              assert.strictEqual(
                receipt.status,
                "0x1",
                `Transaction sent with estimated gas should not have failed. Gas used: ${estimate}`
              );
            });

            it("Should estimate gas perfectly with EIP150 - CREATE", async () => {
              const contract = contracts.get("ContractFactory.sol");
              const tx1 = {
                from,
                to: contract.address,
                data: `0x${contract["createInstance()"]}`
              };
              const estimateHex = await provider.send("eth_estimateGas", [tx1]);
              const estimate = Quantity.toBigInt(estimateHex);
              const tx2 = {
                ...tx1,
                gas: Quantity.toString(estimate - 1n)
              };
              await assert.rejects(sendAndGetReceipt(tx2), {
                message: "VM Exception while processing transaction: revert"
              });

              const tx3 = {
                ...tx1,
                gas: estimateHex
              };
              const receipt = await sendAndGetReceipt(tx3);
              await assert.strictEqual(
                receipt.status,
                "0x1",
                `SANITY CHECK. Still not enough gas? ${estimate} Our estimate is still too low`
              );
            });

            it("Should estimate gas perfectly with EIP150 - CALL INSIDE CREATE", async () => {
              const contract = contracts.get("Donation.sol");
              // Pre-condition
              const donateTx = {
                from,
                to: contract.address,
                value: "0x50",
                data: `0x${contract["donate()"]}`
              };
              const estimate = await provider.send("eth_estimateGas", [
                donateTx
              ]);
              const tx = { ...donateTx, gas: estimate };
              const receipt = await sendAndGetReceipt(tx);
              assert.strictEqual(
                receipt.status,
                "0x1",
                `SANITY CHECK. Failed to send donate transaction with gas estimate: ${estimate}.`
              );

              const moveFundTx = {
                from,
                to: contract.address,
                data: `0x${contract["moveFund(address,uint256)"]}${encodeValue(
                  from
                )}${encodeValue("0x5")}`
              };
              const moveFundEstimate = await provider.send("eth_estimateGas", [
                moveFundTx
              ]);
              const oneless = Quantity.toBigInt(moveFundEstimate) - 1n;
              const tx1 = {
                ...moveFundTx,
                gas: Quantity.toString(oneless)
              };
              // send the transaction with one less gas than the estimate
              await assert.rejects(sendAndGetReceipt(tx1), {
                message: "VM Exception while processing transaction: out of gas"
              });
              const tx2 = { ...moveFundTx, gas: moveFundEstimate };
              const receipt2 = await sendAndGetReceipt(tx2);
              assert.strictEqual(
                receipt2.status,
                "0x1",
                `SANITY CHECK. Still not enough gas? ${moveFundEstimate} Our estimate is still too low`
              );
            });

            if (hardfork !== "byzantium") {
              it("Should estimate gas perfectly with EIP150 - DELEGATECALL", async () => {
                const contract = contracts.get("TestDepth.sol");
                const depth = 3;
                const promises = Array(depth)
                  .fill(0)
                  .map((_, i) => {
                    const depth = i + 1;
                    const tx = {
                      from,
                      to: contract.address,
                      data: `0x${contract["depth(uint256)"]}${encodeValue(
                        depth
                      )}`
                    };
                    return provider
                      .send("eth_estimateGas", [tx])
                      .then(estimate => {
                        const oneless = Quantity.toBigInt(estimate) - 1n;
                        const tx2 = {
                          ...tx,
                          gas: Quantity.toString(oneless)
                        };
                        const tx3 = { ...tx, gas: estimate };
                        return Promise.all([
                          assert.rejects(sendAndGetReceipt(tx2), {
                            message:
                              "VM Exception while processing transaction: out of gas"
                          }),
                          sendAndGetReceipt(tx3).then(receipt => {
                            assert.strictEqual(
                              receipt.status,
                              "0x1",
                              `SANITY CHECK. Still not enough gas? ${estimate} Our estimate is still too low`
                            );
                          })
                        ]);
                      });
                  });
                await Promise.all(promises);
              });
              it.skip(
                "2Should estimate gas perfectly with EIP150 - DELEGATECALL",
                async () => {
                  const contract = contracts.get("TestDepth.sol");
                  const depth = 10;
                  for (let i = 0; i < depth; i++) {
                    const depth = i + 1;
                    const tx = {
                      from,
                      to: contract.address,
                      data: `0x${contract["depth(uint256)"]}${encodeValue(
                        depth
                      )}`
                    };
                    const estimate = await provider.send("eth_estimateGas", [
                      tx
                    ]);
                    const oneless = Quantity.toBigInt(estimate) - 1n;
                    const tx2 = {
                      ...tx,
                      gas: Quantity.toString(oneless)
                    };
                    const tx3 = { ...tx, gas: estimate };
                    try {
                      const receipt = await sendAndGetReceipt(tx3);
                      const onelessReceipt = await sendAndGetReceipt(tx2);
                      console.log(receipt, onelessReceipt);
                    } catch (e) {
                      console.log(`depth of ${depth} failed as expected`);
                    }
                  }
                }
              ).timeout(0);

              it.skip(
                "Should estimate gas perfectly with EIP150 - CREATE2",
                async () => {
                  const contract = contracts.get("CreateTwo.sol");
                  const bytecode = JSON.parse(
                    readFileSync(join(contractDir, "GasLeft.sol"), "utf8")
                  ).contract.evm.bytecode.object;
                  const bytecodeWithParams = `0x${bytecode}${encodeValue(
                    from
                  )}`;
                  const hashedBytecode = keccak(
                    Quantity.toBuffer(bytecodeWithParams)
                  );
                  const salt = `0x${"0".repeat(63)}1`;
                  const unhashedAddress = `0x${[
                    "ff",
                    contract.address,
                    salt,
                    Quantity.toString(hashedBytecode)
                  ]
                    .map(val => val.replace(/0x/, ""))
                    .join("")}`.slice(-40);
                  const futureAddress = `0x${Quantity.toString(
                    keccak(Quantity.toBuffer(unhashedAddress))
                  )}`.toLowerCase();

                  const codeCheck = await provider.send("eth_getCode", [
                    futureAddress
                  ]);
                  assert(
                    codeCheck.slice(2).length === 0,
                    "contract should not be deployed on chain!"
                  );

                  const nonce = await provider.send("eth_getTransactionCount", [
                    from
                  ]);
                  const receipt = await sendAndGetReceipt({
                    from,
                    to: contract.address,
                    data: `0x${contract["deploy(bytes memory,uint256)"]}`
                  });

                  // const addr = result.events.RelayAddress.returnValues.addr;
                  // assert(
                  //   addr,
                  //   futureAddress,
                  //   "future contract address not the same as computed value"
                  // );
                  // const codeCheck2 = await web3.eth.getCode(futureAddress);
                  // assert(
                  //   codeCheck2.slice(2).length > 0,
                  //   "contract should be deployed on chain!"
                  // );
                }
              ).timeout(0);

              //   // TODO: Make this actually test SVT
              //   it("Should estimate gas perfectly with EIP150 - Simple Value Transfer", async () => {
              //     const { accounts, instance, send, web3 } = SendContract;
              //     const toBN = hex => new BN(hex.substring(2), "hex");
              //     const toBNStr = (hex, base = 10) => toBN(hex).toString(base);
              //     const sign = createSignedTx(privateKey);
              //     const gasPrice = "0x77359400";
              //     const amountToTransfer = "0xfffffff1ff000000";

              //     // Get initial Balance after contract deploy
              //     const { result: balance } = await send(
              //       "eth_getBalance",
              //       accounts[0]
              //     );

              //     // Initial seeding of capital to contract, we check the balance after.
              //     const tx = {
              //       gasPrice,
              //       value: amountToTransfer, // ~18 ether
              //       from: accounts[0],
              //       to: instance._address
              //     };
              //     ({ result: tx.gasLimit } = await send("eth_estimateGas", tx));
              //     const { result: hash } = await send("eth_sendTransaction", tx);
              //     const {
              //       result: { gasUsed: initialGasUsed }
              //     } = await send("eth_getTransactionReceipt", hash);

              //     // Assert that the contract has the correct balance ~18 ether
              //     const getBalance = await instance.methods
              //       .getBalance()
              //       .call({ from: accounts[0] });
              //     assert.strictEqual(
              //       toBNStr(amountToTransfer),
              //       getBalance,
              //       "balance is not ~18 ether"
              //     );

              //     // It's not neccessary to sign but currently it's the only test that demonstrates sending signed
              //     // transactions that call a contract method.
              //     // Calling `encodeABI()` on the desired contract method will return the
              //     // the necessary bytecode to call the contract method with the given parameters
              //     // NOTE: errors from encodeABI are likely do to incorrect types for the method arguments
              //     // Double check the contracts method signature and your arguments
              //     // Ex: transfer(Address[], uint))  =>  transfer(Array, hex string of int)
              //     const txParams = {
              //       gasPrice,
              //       nonce: "0x2",
              //       to: instance._address,
              //       value: "0x0",
              //       data: instance.methods
              //         .transfer(accounts, amountToTransfer)
              //         .encodeABI()
              //     };
              //     ({ result: txParams.gasLimit } = await send(
              //       "eth_estimateGas",
              //       sign(txParams).serialize()
              //     ));
              //     const { gasUsed: signedGasUsed } =
              //       await web3.eth.sendSignedTransaction(
              //         sign(txParams).serialize()
              //       );
              //     const { result: newBalance } = await send(
              //       "eth_getBalance",
              //       accounts[0]
              //     );
              //     // Gasprice * ( sum of gas used )
              //     const gas = toBN(gasPrice).mul(
              //       toBN(initialGasUsed).addn(signedGasUsed)
              //     );
              //     // Our current balance, plus the wei spent on gas === original gas
              //     const currentBalancePlusGas = toBN(newBalance)
              //       .add(gas)
              //       .toString();
              //     assert.strictEqual(
              //       toBNStr(balance),
              //       currentBalancePlusGas,
              //       "balance + gas used !== to start balance"
              //     );

              //     // Assert that signed tx successfully drains contract to address
              //     const newContractBalance = await instance.methods
              //       .getBalance()
              //       .call({ from: accounts[0] });
              //     assert.strictEqual(newContractBalance, "0", "balance is not 0");
              //   }).timeout(10000);
            }

            // it("should correctly handle non-zero value child messages", async () => {
            //   const {
            //     accounts: [from],
            //     instance: { _address: to, methods },
            //     send
            //   } = NonZero;
            //   const fns = [methods.doSend, methods.doTransfer, methods.doCall];
            //   for (let i = 0, l = fns; i < l.length; i++) {
            //     const tx = {
            //       from,
            //       to,
            //       value: "1000000000000000000",
            //       data: fns[i]().encodeABI()
            //     };
            //     const { result: gasLimit } = await send("eth_estimateGas", tx);
            //     tx.gasLimit = "0x" + (parseInt(gasLimit) - 1).toString(16);
            //     await assert.rejects(() => send("eth_sendTransaction", tx), {
            //       message:
            //         "VM Exception while processing transaction: out of gas"
            //     });
            //     tx.gasLimit = gasLimit;
            //     await assert.doesNotReject(
            //       () => send("eth_sendTransaction", tx),
            //       undefined,
            //       `SANITY CHECK. Still not enough gas? ${gasLimit} Our estimate is still too low`
            //     );
            //   }
            // });
          });

          describe("Refunds", function () {
            it(`accounts for Rsclear Refund in gasEstimate when a dirty storage slot is reset and it's original value is 0`, async function () {
              const { address, ...methods } = contracts.get("EstimateGas.sol");
              const options = {
                from,
                gas: Quantity.toString(5000000),
                to: address
              };
              // prime storage by making sure it is set to 0
              const { status } = await sendAndGetReceipt({
                ...options,
                data: `0x${methods["reset()"]}`
              });
              assert.strictEqual(
                status,
                "0x1",
                "Failed to prime storage in gas refund test."
              );
              // update storage and then reset it back to 0
              const tx = {
                ...options,
                data: `0x${methods["triggerRsclearRefund()"]}`
              };

              const estimate = Quantity.toBigInt(
                await provider.send("eth_estimateGas", [tx])
              );
              const receipt = await sendAndGetReceipt(tx);

              const gasUsed = Quantity.toBigInt(receipt.gasUsed);
              switch (hardfork) {
                case "byzantium":
                case "petersburg":
                  assert.strictEqual(gasUsed, estimate - RSCLEAR_REFUND);
                  break;
                case "muirGlacier":
                case "istanbul":
                  // EIP-2200
                  assert(
                    gasUsed <=
                      estimate -
                        RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO_ISTANBUL +
                        2300n
                  );
                  break;
                case "constantinople":
                  // since storage was initially primed to 0 and we call triggerRsclearRefund(), which then
                  // resets storage back to 0, 19800 gas is added to the refund counter per Constantinople EIP 1283
                  assert.strictEqual(
                    gasUsed,
                    estimate - RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO
                  );
                  break;
                default:
                  throw new Error("Invalid hardfork option: " + hardfork);
              }
              assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
            });
            //   it(
            //     "accounts for Rsclear Refund in gasEstimate when a dirty storage slot is reset and it's " +
            //       "original value is not 0",
            //     async function () {
            //       const { accounts, instance, provider } = context;
            //       const from = accounts[0];
            //       const rsclearRefundForResettingDirtySlotToNonZeroValue = 4800;
            //       const rsclearRefundForResettingDirtySlotToNonZeroValueIstanbul = 4200;
            //       const options = { from, gas: 5000000 };
            //       await instance.methods.reset().send(options); // prime storage by making sure y is set to 1
            //       // update storage and then reset it back to 1
            //       const method = instance.methods.triggerRsclearRefundForY();
            //       const gasEstimate = await method.estimateGas(options);
            //       const receipt = await method.send({ from, gas: gasEstimate });
            //       switch (provider.options.hardfork) {
            //         case "byzantium":
            //         case "petersburg":
            //           // since we are resetting to a non-zero value, there is no gas added to the refund counter here
            //           assert.strictEqual(receipt.gasUsed, gasEstimate);
            //           break;
            //         case "muirGlacier":
            //         case "istanbul": // EIP-2200
            //           assert(
            //             receipt.gasUsed <=
            //               gasEstimate -
            //                 rsclearRefundForResettingDirtySlotToNonZeroValueIstanbul +
            //                 2300
            //           );
            //           break;
            //         case "constantinople":
            //           // since storage was initially primed to 1 and we call triggerRsclearRefundForY(), which then
            //           // resets storage back to 1, 4800 gas is added to the refund counter per Constantinople EIP 1283
            //           assert.strictEqual(
            //             receipt.gasUsed,
            //             gasEstimate -
            //               rsclearRefundForResettingDirtySlotToNonZeroValue
            //           );
            //           break;
            //         default:
            //           throw new Error(
            //             "Invalid hardfork option: " + provider.options.hardfork
            //           );
            //       }
            //       assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
            //     }
            //   );
            //   it(
            //     "accounts for Rsclear Refund in gasEstimate when a fresh storage slot's original " +
            //       "value is not 0 and new value is 0",
            //     async function () {
            //       const { accounts, instance, provider } = context;
            //       const from = accounts[0];
            //       const options = { from, gas: 5000000 };
            //       // prime storage by making sure storage is set to 1
            //       await instance.methods.initialSettingOfX().send(options);
            //       // update storage to be 0
            //       const method = instance.methods.reset();
            //       const gasEstimate = await method.estimateGas(options);
            //       const receipt = await method.send({ from, gas: gasEstimate });
            //       switch (provider.options.hardfork) {
            //         case "byzantium":
            //         case "petersburg":
            //         case "constantinople":
            //           assert.strictEqual(
            //             receipt.gasUsed,
            //             gasEstimate - RSCLEAR_REFUND
            //           );
            //           break;
            //         case "muirGlacier":
            //         case "istanbul": // EIP-2200
            //           assert(
            //             receipt.gasUsed <= gasEstimate - RSCLEAR_REFUND + 2300
            //           );
            //           break;
            //         default:
            //           throw new Error(
            //             "Invalid hardfork option: " + provider.options.hardfork
            //           );
            //       }
            //       assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
            //     }
            //   );
            //   it(
            //     "accounts for Rsclear Refund in gasEstimate when a dirty storage slot's original value " +
            //       "is not 0 and new value is 0",
            //     async function () {
            //       const { accounts, instance, provider } = context;
            //       const from = accounts[0];
            //       const options = { from, gas: 5000000 };
            //       // prime storage by making sure storage is set to 1
            //       await instance.methods.initialSettingOfX().send(options);
            //       // update storage and then reset it to 0
            //       const method = instance.methods.triggerRsclearRefund();
            //       const gasEstimate = await method.estimateGas(options);
            //       const receipt = await method.send({ from, gas: gasEstimate });
            //       switch (provider.options.hardfork) {
            //         case "byzantium":
            //         case "petersburg":
            //         case "constantinople":
            //           assert.strictEqual(
            //             receipt.gasUsed,
            //             gasEstimate - RSCLEAR_REFUND
            //           );
            //           break;
            //         case "muirGlacier":
            //         case "istanbul": // EIP-2200
            //           assert(
            //             receipt.gasUsed <= gasEstimate - RSCLEAR_REFUND + 2300
            //           );
            //           break;
            //         default:
            //           throw new Error(
            //             "Invalid hardfork option: " + provider.options.hardfork
            //           );
            //       }
            //       assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
            //     }
            //   );
            //   it(
            //     "accounts for Rsclear Refund in gasEstimate when a dirty storage slot's original value " +
            //       "is not 0 and current value is 0",
            //     async function () {
            //       const { accounts, instance, provider } = context;
            //       const from = accounts[0];
            //       const options = { from, gas: 5000000 };
            //       // prime storage by making sure storage is set to 1
            //       await instance.methods.initialSettingOfX().send(options);
            //       // updates current value to 0 and new value to be the remaining amount of gas
            //       const method = instance.methods.triggerRsclearRefundForX();
            //       const gasEstimate = await method.estimateGas(options);
            //       const receipt = await method.send({ from, gas: gasEstimate });
            //       switch (provider.options.hardfork) {
            //         case "byzantium":
            //         case "petersburg":
            //           assert.strictEqual(
            //             receipt.gasUsed,
            //             gasEstimate - RSCLEAR_REFUND
            //           );
            //           break;
            //         case "muirGlacier":
            //         case "istanbul":
            //           assert(receipt.gasUsed <= gasEstimate + 2300);
            //           break;
            //         case "constantinople":
            //           // since storage was initially primed to 1 and we call triggerRsclearRefundForX(), which then
            //           // resets storage's current value to 0 and 15000 gas is added to the refund counter, and then
            //           // it replaces x with gasleft, which removes 150000 gas from the refund counter per Constantinople
            //           // EIP 1283 leaving us with a rsclear refund of 0
            //           assert.strictEqual(receipt.gasUsed, gasEstimate);
            //           break;
            //         default:
            //           throw new Error(
            //             "Invalid hardfork option: " + provider.options.hardfork
            //           );
            //       }
            //       assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
            //     }
            //   );
            //   it("accounts for Rselfdestruct Refund in gasEstimate", async function () {
            //     const { abi, accounts, bytecode, web3 } = context;
            //     const from = accounts[0];
            //     const options = { from, gas: 5000000 };
            //     const deploymentOptions = { gas: 3141592 };
            //     const { instance } = await deploy(
            //       abi,
            //       bytecode,
            //       web3,
            //       deploymentOptions
            //     );
            //     await instance.methods.reset().send(options); // prime storage by making sure it is set to 0
            //     const method = instance.methods.triggerRselfdestructRefund();
            //     const gasEstimate = await method.estimateGas(options);
            //     const receipt = await method.send({ from, gas: gasEstimate });
            //     assert.strictEqual(
            //       receipt.gasUsed,
            //       gasEstimate - RSELFDESTRUCT_REFUND
            //     );
            //     assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
            //   });
            //   it("accounts for Rsclear and Rselfdestruct Refunds in gasEstimate", async function () {
            //     const { abi, accounts, bytecode, provider, web3 } = context;
            //     const from = accounts[0];
            //     const deploymentOptions = { gas: 3141592 };
            //     const { instance } = await deploy(
            //       abi,
            //       bytecode,
            //       web3,
            //       deploymentOptions
            //     );
            //     await instance.methods.reset().send({ from, gas: 5000000 }); // prime storage by making sure it is set to 0
            //     const method = instance.methods.triggerAllRefunds();
            //     const gasEstimate = await method.estimateGas({ from });
            //     const receipt = await method.send({ from, gas: gasEstimate });
            //     switch (provider.options.hardfork) {
            //       case "byzantium":
            //       case "petersburg":
            //         assert.strictEqual(
            //           receipt.gasUsed,
            //           gasEstimate - RSELFDESTRUCT_REFUND - RSCLEAR_REFUND
            //         );
            //         break;
            //       case "muirGlacier":
            //       case "istanbul": // EIP-2200
            //         assert.strictEqual(
            //           receipt.gasUsed,
            //           gasEstimate -
            //             RSELFDESTRUCT_REFUND -
            //             RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO_ISTANBUL
            //         );
            //         break;
            //       case "constantinople":
            //         // since storage was initially primed to 0 and we call triggerAllRefunds(), which then
            //         // resets storage back to 0, 19800 gas is added to the refund counter per Constantinople EIP 1283
            //         assert.strictEqual(
            //           receipt.gasUsed,
            //           gasEstimate -
            //             RSELFDESTRUCT_REFUND -
            //             RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO
            //         );
            //         break;
            //       default:
            //         throw new Error(
            //           "Invalid hardfork option: " + provider.options.hardfork
            //         );
            //     }
            //     assert.strictEqual(receipt.gasUsed, receipt.cumulativeGasUsed);
            //   });
            //   it("account Rsclear/Rselfdestruct/Refunds in gasEstimate w/many transactions in a block", async function () {
            //     const { abi, bytecode, provider } = context;
            //     const options = {
            //       seed,
            //       hardfork
            //     };
            //     const { send, accounts, web3 } = await initializeTestProvider(
            //       options
            //     );
            //     const transactions = [
            //       {
            //         value: "0x10000000",
            //         gasLimit: "0x33450",
            //         from: accounts[2],
            //         to: accounts[1],
            //         nonce: "0x0"
            //       },
            //       {
            //         value: "0x10000000",
            //         gasLimit: "0x33450",
            //         from: accounts[2],
            //         to: accounts[1],
            //         nonce: "0x1"
            //       },
            //       {
            //         value: "0x10000000",
            //         gasLimit: "0x33450",
            //         from: accounts[1], // <
            //         to: accounts[2], // <^ reversed tx order
            //         nonce: "0x0"
            //       }
            //     ];
            //     // Precondition
            //     const initialBlockNumber = await web3.eth.getBlockNumber();
            //     assert.deepStrictEqual(
            //       initialBlockNumber,
            //       0,
            //       "Current Block Should be 0"
            //     );
            //     const deploymentOptions = { gas: 3141592 };
            //     const { instance } = await deploy(
            //       abi,
            //       bytecode,
            //       web3,
            //       deploymentOptions
            //     );
            //     // prime storage by making sure it is set to 0
            //     await instance.methods
            //       .reset()
            //       .send({ from: accounts[0], gas: 5000000 });
            //     await send("miner_stop");
            //     const hashes = await Promise.all(
            //       transactions.map(transaction => {
            //         const promiEvent = web3.eth.sendTransaction(transaction);
            //         return new Promise(resolve => {
            //           promiEvent.once("transactionHash", async hash => {
            //             // Ensure there's no receipt since the transaction hasn't yet been processed. Ensure IntervalMining
            //             const receipt = await web3.eth.getTransactionReceipt(
            //               hash
            //             );
            //             assert.strictEqual(
            //               receipt,
            //               null,
            //               "No receipt since the transaction hasn't yet been processed."
            //             );
            //             resolve(hash);
            //           });
            //         });
            //       })
            //     );
            //     const currentBlockNumber = await web3.eth.getBlockNumber();
            //     assert.deepStrictEqual(
            //       currentBlockNumber,
            //       2,
            //       "Current Block Should be 2"
            //     );
            //     const method = instance.methods.triggerAllRefunds();
            //     const gasEstimate = await method.estimateGas({
            //       from: accounts[0]
            //     });
            //     const prom = method.send({ from: accounts[0], gas: gasEstimate });
            //     await new Promise(resolve => {
            //       prom.once("transactionHash", resolve);
            //     });
            //     await send("evm_mine");
            //     // web3 doesn't subscribe fast enough to newHeads after issuing the previous send
            //     // we we mine another block to give it an additional newHeads notification. /shrug
            //     await send("evm_mine");
            //     const rec = await prom;
            //     const { gasUsed } = rec;
            //     let transactionCostMinusRefund =
            //       gasEstimate - RSELFDESTRUCT_REFUND - RSCLEAR_REFUND;
            //     switch (provider.options.hardfork) {
            //       case "byzantium":
            //       case "petersburg":
            //         assert.strictEqual(gasUsed, transactionCostMinusRefund);
            //         break;
            //       case "muirGlacier":
            //       case "istanbul":
            //         // EIP-2200
            //         transactionCostMinusRefund =
            //           gasEstimate -
            //           RSELFDESTRUCT_REFUND -
            //           RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO_ISTANBUL;
            //         assert.strictEqual(gasUsed, transactionCostMinusRefund);
            //         break;
            //       case "constantinople":
            //         // since storage was initially primed to 0 and we call triggerAllRefunds(), which then
            //         // resets storage back to 0, 19800 gas is added to the refund counter per Constantinople EIP 1283
            //         transactionCostMinusRefund =
            //           gasEstimate -
            //           RSELFDESTRUCT_REFUND -
            //           RSCLEAR_REFUND_FOR_RESETTING_DIRTY_SLOT_TO_ZERO;
            //         assert.strictEqual(gasUsed, transactionCostMinusRefund);
            //         break;
            //       default:
            //         throw new Error(
            //           "Invalid hardfork option: " + provider.options.hardfork
            //         );
            //     }
            //     const receipt = await Promise.all(
            //       hashes.map(hash => web3.eth.getTransactionReceipt(hash))
            //     );
            //     assert.deepStrictEqual(
            //       receipt[0].gasUsed,
            //       receipt[1].gasUsed,
            //       "Tx1 and Tx2 should cost the same gas."
            //     );
            //     assert.deepStrictEqual(
            //       receipt[1].gasUsed,
            //       receipt[2].gasUsed,
            //       "Tx2 and Tx3 should cost the same gas. -> Tx1 gas === Tx3 gas Transitive"
            //     );
            //     assert.deepStrictEqual(
            //       receipt[1].transactionIndex > receipt[2].transactionIndex,
            //       true,
            //       "(Tx3 has a lower nonce) -> (Tx3 index is < Tx2 index)"
            //     );
            //     const currentBlock = await web3.eth.getBlock(
            //       receipt[0].blockNumber
            //     );
            //     // ( Tx3 has a lower nonce -> Tx3 index is < Tx2 index ) -> cumulative gas Tx2 > Tx3 > Tx1
            //     const isAccumulating =
            //       receipt[1].cumulativeGasUsed > receipt[2].cumulativeGasUsed &&
            //       receipt[2].cumulativeGasUsed > receipt[0].cumulativeGasUsed;
            //     assert.deepStrictEqual(
            //       isAccumulating,
            //       true,
            //       "Cumulative gas should be accumulating for any transactions in the same block."
            //     );
            //     assert.deepStrictEqual(
            //       receipt[0].gasUsed,
            //       receipt[0].cumulativeGasUsed,
            //       "Gas and cumulative gas should be equal for the FIRST Tx."
            //     );
            //     assert.notDeepStrictEqual(
            //       receipt[1].gasUsed,
            //       receipt[1].cumulativeGasUsed,
            //       "Gas and cumulative gas should NOT be equal for the Second Tx."
            //     );
            //     assert.notDeepStrictEqual(
            //       receipt[2].gasUsed,
            //       receipt[2].cumulativeGasUsed,
            //       "Gas and cumulative gas should NOT be equal for the Third Tx."
            //     );
            //     const totalGas =
            //       receipt[0].gasUsed + receipt[1].gasUsed + receipt[2].gasUsed;
            //     assert.deepStrictEqual(
            //       totalGas + transactionCostMinusRefund,
            //       receipt[1].cumulativeGasUsed,
            //       "Total Gas should equal the final tx.cumulativeGas"
            //     );
            //     assert.deepStrictEqual(
            //       totalGas + transactionCostMinusRefund,
            //       currentBlock.gasUsed,
            //       "Total Gas should be equal to the currentBlock.gasUsed"
            //     );
            //   });
            //   it("clears mapping storage slots", async function () {
            //     const { accounts, instance } = context;
            //     const from = accounts[0];
            //     const options = { from };
            //     await instance.methods.reset().send({ from, gas: 5000000 });
            //     const uintsa = await instance.methods.uints(1).call();
            //     assert.strictEqual(uintsa, "0", "initial value is not correct");
            //     const receipta = await instance.methods.store(1).send(options);
            //     assert.strictEqual(
            //       receipta.status,
            //       true,
            //       "storing value did not work"
            //     );
            //     const uintsb = await instance.methods.uints(1).call();
            //     assert.strictEqual(uintsb, "1", "set value is incorrect");
            //     const receiptb = await instance.methods.clear().send(options);
            //     assert.strictEqual(
            //       receiptb.status,
            //       true,
            //       "clearing value did not work"
            //     );
            //     const uintsc = await instance.methods.uints(1).call();
            //     assert.strictEqual(uintsc, "0", "cleared value is not correct");
            //   });
            // }).timeout(4000);
            // describe("Estimation", function () {
            //   it("matches estimate for deployment", async function () {
            //     const { accounts, bytecode, contract, receipt } = context;
            //     const gasEstimate = await contract
            //       .deploy({ data: bytecode })
            //       .estimateGas({
            //         from: accounts[1]
            //       });
            //     assert.deepStrictEqual(receipt.gasUsed, gasEstimate);
            //     assert.deepStrictEqual(receipt.cumulativeGasUsed, gasEstimate);
            //   }).timeout(4000);
            //   it("matches usage for complex function call (add)", async function () {
            //     const { accounts, instance } = context;
            //     await testTransactionEstimate(
            //       instance.methods.add,
            //       [toBytesHexString("Tim"), toBytesHexString("A great guy"), 10],
            //       { from: accounts[0], gas: 3141592 },
            //       instance
            //     );
            //   }).timeout(10000);
            //   it("matches usage for complex function call (transfer)", async function () {
            //     const { accounts, instance } = context;
            //     await testTransactionEstimate(
            //       instance.methods.transfer,
            //       [
            //         "0x0123456789012345678901234567890123456789",
            //         5,
            //         toBytesHexString("Tim")
            //       ],
            //       { from: accounts[0], gas: 3141592 },
            //       instance
            //     );
            //   }).timeout(10000);
            //   it("matches usage for simple account to account transfer", async function () {
            //     const { accounts, web3 } = context;
            //     const transferAmount = web3.utils.toBN(
            //       web3.utils.toWei("5", "finney")
            //     );
            //     const transactionData = {
            //       from: accounts[0],
            //       to: accounts[1],
            //       value: transferAmount
            //     };
            //     const web3Transactions = [
            //       await web3.eth.estimateGas(transactionData),
            //       await web3.eth.sendTransaction(transactionData)
            //     ];
            //     const [gasEstimate, receipt] = await Promise.all(
            //       web3Transactions
            //     );
            //     assert.strictEqual(receipt.gasUsed, gasEstimate);
            //   });
            // });
            // describe("Expenditure", function () {
            //   it("should calculate gas expenses correctly in consideration of the default gasPrice", async function () {
            //     const { accounts, web3 } = context;
            //     const transferAmount = "500";
            //     const gasPrice = await web3.eth.getGasPrice();
            //     await confirmGasPrice(
            //       gasPrice,
            //       false,
            //       web3,
            //       accounts,
            //       transferAmount
            //     );
            //   });
            //   it("should calculate gas expenses correctly in consideration of the requested gasPrice", async function () {
            //     const transferAmount = "500";
            //     const gasPrice = "0x10000";
            //     const { accounts, web3 } = context;
            //     await confirmGasPrice(
            //       gasPrice,
            //       true,
            //       web3,
            //       accounts,
            //       transferAmount
            //     );
            //   });
            //   it("should calculate gas expenses correctly with a user-defined default gasPrice", async function () {
            //     const transferAmount = "500";
            //     const gasPrice = "0x2000";
            //     const options = { seed, gasPrice };
            //     const { accounts, web3 } = await initializeTestProvider(options);
            //     await confirmGasPrice(
            //       gasPrice,
            //       false,
            //       web3,
            //       accounts,
            //       transferAmount
            //     );
            //   });
            //   it("should calculate cumalativeGas and gasUsed correctly for many transactions in a block", async function () {
            //     const options = {
            //       blockTime: 0.5, // seconds
            //       seed
            //     };
            //     const { send, accounts, web3 } = await initializeTestProvider(
            //       options
            //     );
            //     await send("miner_stop");
            //     const transactions = [
            //       {
            //         value: "0x10000000",
            //         gasLimit: "0x33450",
            //         from: accounts[0],
            //         to: accounts[1],
            //         nonce: "0x0"
            //       },
            //       {
            //         value: "0x10000000",
            //         gasLimit: "0x33450",
            //         from: accounts[0],
            //         to: accounts[1],
            //         nonce: "0x1"
            //       },
            //       {
            //         value: "0x10000000",
            //         gasLimit: "0x33450",
            //         from: accounts[1], // <
            //         to: accounts[0], // <^ reversed tx order
            //         nonce: "0x0"
            //       }
            //     ];
            //     // Precondition
            //     const initialBlockNumber = await web3.eth.getBlockNumber();
            //     assert.deepStrictEqual(
            //       initialBlockNumber,
            //       0,
            //       "Current Block Should be 0"
            //     );
            //     const hashes = await Promise.all(
            //       transactions.map(transaction => {
            //         const promiEvent = web3.eth.sendTransaction(transaction);
            //         return new Promise(resolve => {
            //           promiEvent.once("transactionHash", async hash => {
            //             // Ensure there's no receipt since the transaction hasn't yet been processed. Ensure IntervalMining
            //             const receipt = await web3.eth.getTransactionReceipt(
            //               hash
            //             );
            //             assert.strictEqual(
            //               receipt,
            //               null,
            //               "No receipt since the transaction hasn't yet been processed."
            //             );
            //             resolve(hash);
            //           });
            //         });
            //       })
            //     );
            //     await send("evm_mine");
            //     const currentBlockNumber = await web3.eth.getBlockNumber();
            //     assert.deepStrictEqual(
            //       currentBlockNumber,
            //       1,
            //       "Current Block Should be 1"
            //     );
            //     const [currentBlock, receipt] = await Promise.all([
            //       web3.eth.getBlock(currentBlockNumber),
            //       Promise.all(
            //         hashes.map(hash => web3.eth.getTransactionReceipt(hash))
            //       )
            //     ]);
            //     assert.deepStrictEqual(
            //       receipt[0].gasUsed,
            //       receipt[1].gasUsed,
            //       "Tx1 and Tx2 should cost the same gas."
            //     );
            //     assert.deepStrictEqual(
            //       receipt[1].gasUsed,
            //       receipt[2].gasUsed,
            //       "Tx2 and Tx3 should cost the same gas. -> Tx1 gas === Tx3 gas Transitive"
            //     );
            //     assert.deepStrictEqual(
            //       receipt[1].transactionIndex > receipt[2].transactionIndex,
            //       true,
            //       "(Tx3 has a lower nonce) -> (Tx3 index is < Tx2 index)"
            //     );
            //     // ( Tx3 has a lower nonce -> Tx3 index is < Tx2 index ) -> cumulative gas Tx2 > Tx3 > Tx1
            //     const isAccumulating =
            //       receipt[1].cumulativeGasUsed > receipt[2].cumulativeGasUsed &&
            //       receipt[2].cumulativeGasUsed > receipt[0].cumulativeGasUsed;
            //     assert.deepStrictEqual(
            //       isAccumulating,
            //       true,
            //       "Cumulative gas should be accumulating for any transactions in the same block."
            //     );
            //     assert.deepStrictEqual(
            //       receipt[0].gasUsed,
            //       receipt[0].cumulativeGasUsed,
            //       "Gas and cumulative gas should be equal for the FIRST Tx."
            //     );
            //     assert.notDeepStrictEqual(
            //       receipt[1].gasUsed,
            //       receipt[1].cumulativeGasUsed,
            //       "Gas and cumulative gas should NOT be equal for the Second Tx."
            //     );
            //     assert.notDeepStrictEqual(
            //       receipt[2].gasUsed,
            //       receipt[2].cumulativeGasUsed,
            //       "Gas and cumulative gas should NOT be equal for the Third Tx."
            //     );
            //     const totalGas =
            //       receipt[0].gasUsed + receipt[1].gasUsed + receipt[2].gasUsed;
            //     assert.deepStrictEqual(
            //       totalGas,
            //       receipt[1].cumulativeGasUsed,
            //       "Total Gas should be equal the final tx.cumulativeGas"
            //     );
            //     assert.deepStrictEqual(
            //       totalGas,
            //       currentBlock.gasUsed,
            //       "Total Gas should be equal to the currentBlock.gasUsed"
            //     );
            //   }).timeout(4000);
          });
        });
      });
    });
  });
});
