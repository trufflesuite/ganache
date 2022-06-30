import assert from "assert";
import { EthereumProvider } from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import compile, { CompileOutput } from "../../helpers/compile";
import { join } from "path";
import { BUFFER_EMPTY, Data, Quantity } from "@ganache/utils";
import { CallError } from "@ganache/ethereum-utils";
import Blockchain from "../../../src/blockchain";
import Wallet from "../../../src/wallet";
import { Address } from "@ganache/ethereum-address";
import { Address as EthereumJsAddress } from "ethereumjs-util";
import { SimulationTransaction } from "../../../src/helpers/simulation-handler";
import { Block, RuntimeBlock } from "@ganache/ethereum-block";
import {
  LegacyRpcTransaction,
  TransactionFactory
} from "@ganache/ethereum-transaction";
import { EthereumOptionsConfig } from "@ganache/ethereum-options";
import { GanacheTrie } from "../../../src/helpers/trie";
import { Transaction } from "@ganache/ethereum-transaction";

const encodeValue = (val: number | string) => {
  return Quantity.toBuffer(val).toString("hex").padStart(64, "0");
};

async function deployContract(provider, from, code) {
  await provider.send("eth_subscribe", ["newHeads"]);
  const transactionHash = await provider.send("eth_sendTransaction", [
    {
      from,
      data: code,
      gas: "0xfffff"
    } as any
  ]);
  await provider.once("message");

  const receipt = await provider.send("eth_getTransactionReceipt", [
    transactionHash
  ]);

  return receipt.contractAddress;
}

describe("api", () => {
  describe("eth", () => {
    describe("call", () => {
      describe("normal operation", () => {
        let contract: CompileOutput;
        let provider: EthereumProvider;
        let from, to: string;
        let contractAddress: string;
        let tx: Transaction;

        before("compile", () => {
          contract = compile(join(__dirname, "./contracts/EthCall.sol"), {
            contractName: "EthCall"
          });
        });

        before(async () => {
          provider = await getProvider({ wallet: { deterministic: true } });
          [from, to] = await provider.send("eth_accounts");

          contractAddress = await deployContract(provider, from, contract.code);

          tx = {
            from,
            to: contractAddress,
            data: "0x3fa4f245" // code for the "value" of the contract
          };
        });

        after(async () => {
          provider && (await provider.disconnect());
        });

        it("executes a message call", async () => {
          const result = await provider.send("eth_call", [tx, "latest"]);
          // gets the contract's "value", which should be 5
          assert.strictEqual(Quantity.toNumber(result), 5);
        });

        it("does not create a transaction on the chain", async () => {
          const beforeCall = await provider.send("eth_getBlockByNumber", [
            "latest"
          ]);
          await provider.send("eth_call", [tx, "latest"]);
          const afterCall = await provider.send("eth_getBlockByNumber", [
            "latest"
          ]);
          assert.strictEqual(beforeCall.number, afterCall.number);
        });

        it("allows legacy 'gasPrice' based transactions", async () => {
          const tx = {
            from,
            to: contractAddress,
            data: "0x3fa4f245",
            gasPrice: "0x1"
          };
          const result = await provider.send("eth_call", [tx, "latest"]);
          // we can still get the result when the gasPrice is set
          assert.strictEqual(Quantity.toNumber(result), 5);
        });

        it("allows eip-1559 fee market transactions", async () => {
          const tx: Transaction = {
            from,
            to: contractAddress,
            data: "0x3fa4f245",
            maxFeePerGas: "0xff",
            maxPriorityFeePerGas: "0xff"
          };

          const result = await provider.send("eth_call", [tx, "latest"]);
          // we can still get the result when the maxFeePerGas/maxPriorityFeePerGas are set
          assert.strictEqual(Quantity.toNumber(result), 5);
        });

        it("allows gas price to be omitted", async () => {
          const result = await provider.send("eth_call", [tx, "latest"]);
          // we can get the value if no gas info is given at all
          assert.strictEqual(Quantity.toNumber(result), 5);
        });

        it("rejects transactions that specify both legacy and eip-1559 transaction fields", async () => {
          // `any` because this tests how we handle an invalid transaction
          const tx: any = {
            from,
            to: contractAddress,
            data: "0x3fa4f245",
            maxFeePerGas: "0xff",
            maxPriorityFeePerGas: "0xff",
            gasPrice: "0x1"
          };
          const ethCallProm = provider.send("eth_call", [tx, "latest"]);
          await assert.rejects(
            ethCallProm,
            new Error(
              "both gasPrice and (maxFeePerGas or maxPriorityFeePerGas) specified"
            ),
            "didn't reject transaction with both legacy and eip-1559 gas fields"
          );
        });

        it("does not return an empty result for transactions with insufficient gas", async () => {
          const tx = {
            from,
            to: contractAddress,
            data: "0x3fa4f245",
            gasLimit: "0xf"
          };
          await assert.rejects(provider.send("eth_call", [tx, "latest"]), {
            message: "VM Exception while processing transaction: out of gas"
          });
        });

        it("rejects transactions with insufficient gas", async () => {
          const provider = await getProvider({
            wallet: { deterministic: true }
          });
          const tx = {
            from,
            input: contract.code,
            gas: "0xf"
          };
          const ethCallProm = provider.send("eth_call", [tx, "latest"]);
          const result = {
            execResult: {
              exceptionError: { error: "out of gas" },
              returnValue: BUFFER_EMPTY,
              runState: { programCounter: 0 }
            }
          } as any;
          // the vm error should propagate through to here
          await assert.rejects(
            ethCallProm,
            new CallError(result),
            "didn't reject transaction with insufficient gas"
          );
        });

        it("uses the correct baseFee", async () => {
          const block = await provider.send("eth_getBlockByNumber", ["latest"]);
          const tx = {
            from,
            to: contractAddress,
            data: `0x${contract.contract.evm.methodIdentifiers["getBaseFee()"]}`
          };
          const result = await provider.send("eth_call", [tx, "latest"]);
          assert.strictEqual(BigInt(result), BigInt(block.baseFeePerGas));
        });

        it("returns string data property on revert error", async () => {
          const tx = {
            from,
            to: contractAddress,
            data: `0x${contract.contract.evm.methodIdentifiers["doARevert()"]}`
          };
          const revertString =
            "0x08c379a000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000011796f75206172652061206661696c757265000000000000000000000000000000";
          await assert.rejects(provider.send("eth_call", [tx, "latest"]), {
            message:
              "VM Exception while processing transaction: revert you are a failure",
            data: revertString
          });
        });
      });

      describe("vm state overrides", () => {
        let provider: EthereumProvider;
        let from, to, addr, encodedAddr: string;
        let contract: CompileOutput;
        let methods: { [methodName: string]: string };
        let contractAddress: string;

        before("compile", () => {
          contract = compile(join(__dirname, "./contracts/Inspector.sol"), {
            contractName: "Inspector"
          });
          methods = contract.contract.evm.methodIdentifiers;
        });

        beforeEach(async () => {
          provider = await getProvider({
            chain: { vmErrorsOnRPCResponse: true }
          });
          [from, to, addr] = await provider.send("eth_accounts");
          encodedAddr = encodeValue(addr);
          contractAddress = await deployContract(provider, from, contract.code);
        });

        async function callContract(data, overrides) {
          return await provider.send("eth_call", [
            {
              from,
              to: contractAddress,
              data
            },
            "latest",
            overrides
          ]);
        }

        it("allows override of account nonce", async () => {
          // this is a kind of separate test case from the rest, since we can't easily
          // access an account's nonce in solidity. instead, we'll use the override to
          // set the account's nonce high and send a contract creating transaction. the
          // contract address is generated using the account's nonce, so it should be
          // different from the same eth_call made without overriding the nonce
          const simpleSol =
            "0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000009e6080604052600560008190555060858060196000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80633fa4f24514602d575b600080fd5b60336049565b6040518082815260200191505060405180910390f35b6000548156fea26469706673582212200897f7766689bf7a145227297912838b19bcad29039258a293be78e3bf58e20264736f6c63430007040033";
          const data = `0x${methods["createContract(bytes)"]}${simpleSol}`;
          const override = { [contractAddress]: { nonce: "0xff" } };
          // call to contract factory function with sender account's nonce set to `0xff`
          const overrideNonceAddress = await provider.send("eth_call", [
            {
              from: addr,
              to: contractAddress,
              gas: "0xfffffff",
              data
            },
            "latest",
            override
          ]);
          const overrideNonceAddress1 = await provider.send("eth_call", [
            {
              from: addr,
              to: contractAddress,
              gas: "0xfffffff",
              data
            },
            "latest",
            override
          ]);
          // call to contract factory function with sender account's nonce not over written
          const defaultNonceAddress = await provider.send("eth_call", [
            {
              from: addr,
              to: contractAddress,
              gas: "0xfffffff",
              data
            },
            "latest"
          ]);
          // sanity check: when using the same account nonce, we can repeatedly generate the same contract address
          assert.strictEqual(overrideNonceAddress, overrideNonceAddress1);
          // the address generated depends on the nonce, so the two are difference
          assert.notEqual(overrideNonceAddress, defaultNonceAddress);
        });

        it("allows override of account code", async () => {
          const data = `0x${methods["getCode(address)"]}${encodedAddr}`;
          const override = { [addr]: { code: "0x123456" } };
          const code = await callContract(data, override);
          assert.strictEqual(
            code,
            "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000031234560000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("allows override of account balance", async () => {
          const data = `0x${methods["getBalance(address)"]}${encodedAddr}`;
          const override = {
            [addr]: { balance: "0x1e240" }
          };
          const balance = await callContract(data, override);
          assert.strictEqual(
            balance,
            "0x000000000000000000000000000000000000000000000000000000000001e240"
          );
        });

        it("allows override of storage at a slot", async () => {
          const slot = `0000000000000000000000000000000000000000000000000000000000000001`;
          const data =
            "0xbaddad42baddad42baddad42baddad42baddad42baddad42baddad42baddad42";
          const contractData = `0x${methods["getStorageAt(uint256)"]}${slot}`;

          // the stateDiff override sets the value at the specified slot, leaving the rest of the storage
          // in tact
          const override = {
            [contractAddress]: { stateDiff: { [`0x${slot}`]: data } }
          };
          const storage = await callContract(contractData, override);
          assert.strictEqual(
            storage,
            "0xbaddad42baddad42baddad42baddad42baddad42baddad42baddad42baddad42"
          );
        });

        it("allows clearing of storage and writing at a slot", async () => {
          const slot = `0000000000000000000000000000000000000000000000000000000000000001`;
          const data =
            "0xbaddad42baddad42baddad42baddad42baddad42baddad42baddad42baddad42";
          const getStorageMethod = `0x${methods["getStorageAt(uint256)"]}${slot}`;
          // the state override clears all storage for the contract and sets the value specified at the slot
          const override = {
            [contractAddress]: { state: { [`0x${slot}`]: data } }
          };
          const storage = await callContract(getStorageMethod, override);
          assert.strictEqual(
            storage,
            "0xbaddad42baddad42baddad42baddad42baddad42baddad42baddad42baddad42"
          );
          // call the contract with the same overrides, but get a different storage slot. it should be cleared
          // out. (note, in the contract this storage slot is originally set to 1)
          const emptySlot = `0000000000000000000000000000000000000000000000000000000000000000`;
          const emptyData = `0x0000000000000000000000000000000000000000000000000000000000000000`;
          const getStorageMethod2 = `0x${methods["getStorageAt(uint256)"]}${emptySlot}`;
          const storage2 = await callContract(getStorageMethod2, override);
          assert.strictEqual(storage2, emptyData);
        });

        it("allows setting multiple overrides in one call", async () => {
          const slot1 = `0000000000000000000000000000000000000000000000000000000000000001`;
          const slot2 = `0000000000000000000000000000000000000000000000000000000000000002`;
          const data =
            "0xbaddad42baddad42baddad42baddad42baddad42baddad42baddad42baddad42";
          // create a combined set of overrides that we use for each of these calls
          const override = {
            [addr]: {
              balance: "0x1e240",
              code: "0x123456"
            },
            [contractAddress]: {
              stateDiff: { [`0x${slot1}`]: data, [`0x${slot2}`]: data }
            }
          };
          const getBalanceMethod = `0x${methods["getBalance(address)"]}${encodedAddr}`;
          const balance = await callContract(getBalanceMethod, override);
          assert.strictEqual(
            balance,
            "0x000000000000000000000000000000000000000000000000000000000001e240"
          );

          const getCodeMethod = `0x${methods["getCode(address)"]}${encodedAddr}`;
          const code = await callContract(getCodeMethod, override);
          assert.strictEqual(
            code,
            "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000031234560000000000000000000000000000000000000000000000000000000000"
          );

          const getStorageMethod1 = `0x${methods["getStorageAt(uint256)"]}${slot1}`;
          const getStorageMethod2 = `0x${methods["getStorageAt(uint256)"]}${slot2}`;
          const storage1 = await callContract(getStorageMethod1, override);
          const storage2 = await callContract(getStorageMethod2, override);
          assert.strictEqual(
            storage1,
            "0xbaddad42baddad42baddad42baddad42baddad42baddad42baddad42baddad42"
          );
          assert.strictEqual(
            storage2,
            "0xbaddad42baddad42baddad42baddad42baddad42baddad42baddad42baddad42"
          );
        });

        it("does not persist overrides", async () => {
          const slot = `0000000000000000000000000000000000000000000000000000000000000001`;
          const data =
            "0xbaddad42baddad42baddad42baddad42baddad42baddad42baddad42baddad42";
          // Simulate an unrelated call with overrides.
          const overrides = {
            [addr]: {
              balance: "0x1e240",
              code: "0x123456"
            },
            [contractAddress]: { nonce: "0xff", state: { [`0x${slot}`]: data } }
          };
          const getCodeMethod = `0x${methods["getCode(address)"]}${encodedAddr}`;
          const overrideCode = await callContract(getCodeMethod, overrides);

          const code = await callContract(getCodeMethod, {});
          // The overrides should not have persisted.
          const rawEmptyBytesEncoded =
            "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000";
          assert.strictEqual(code, rawEmptyBytesEncoded);
          assert.notEqual(code, overrideCode);

          const getBalanceMethod = `0x${methods["getBalance(address)"]}${encodedAddr}`;
          const overrideBalance = await callContract(
            getBalanceMethod,
            overrides
          );
          const balance = await callContract(getBalanceMethod, {});
          const startBalance =
            "0x00000000000000000000000000000000000000000000003635c9adc5dea00000";
          assert.strictEqual(balance, startBalance);
          assert.notEqual(balance, overrideBalance);

          // this is hardcoded in the contract
          const getStorageMethod = `0x${methods["getStorageAt(uint256)"]}${slot}`;
          const overrideStorage = await callContract(
            getStorageMethod,
            overrides
          );
          const storage = await callContract(getStorageMethod, {});
          const dataAtSlot = `0x0000000000000000000000000000000000000000000000000000000000000002`;
          assert.strictEqual(storage, dataAtSlot);
          assert.notEqual(storage, overrideStorage);

          const simpleSol =
            "0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000009e6080604052600560008190555060858060196000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80633fa4f24514602d575b600080fd5b60336049565b6040518082815260200191505060405180910390f35b6000548156fea26469706673582212200897f7766689bf7a145227297912838b19bcad29039258a293be78e3bf58e20264736f6c63430007040033";
          const testNonceMethod = `0x${methods["createContract(bytes)"]}${simpleSol}`;
          const overrideTestContractAddress = await callContract(
            testNonceMethod,
            overrides
          );
          const testContractAddress = await callContract(testNonceMethod, {});
          assert.notEqual(testContractAddress, overrideTestContractAddress);
        });

        it("does not allow both state && stateDiff", async () => {
          const slot = `0000000000000000000000000000000000000000000000000000000000000001`;
          const data =
            "0xbaddad42baddad42baddad42baddad42baddad42baddad42baddad42baddad42";
          // the stateDiff override sets the value at the specified slot, leaving the rest of the storage
          // in tact
          const override = {
            [contractAddress]: {
              stateDiff: { [`0x${slot}`]: data },
              state: { [`0x${slot}`]: data }
            }
          };
          const getStorageMethod = `0x${methods["getStorageAt(uint256)"]}${slot}`;
          await assert.rejects(callContract(getStorageMethod, override), {
            message: "both state and stateDiff overrides specified"
          });
        });

        it("does not use invalid override, does use valid override data", async () => {
          const slot = `0000000000000000000000000000000000000000000000000000000000000001`;
          const data = `0xbaddad42baddad42baddad42baddad42baddad42baddad42baddad42baddad42`;
          const simpleSol =
            "0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000009e6080604052600560008190555060858060196000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80633fa4f24514602d575b600080fd5b60336049565b6040518082815260200191505060405180910390f35b6000548156fea26469706673582212200897f7766689bf7a145227297912838b19bcad29039258a293be78e3bf58e20264736f6c63430007040033";
          // to test clearing an account's code, we need another contract that has its code set.
          const contractAddress2 = await deployContract(
            provider,
            from,
            contract.code
          );
          const currentNonceGeneratedAddress = await callContract(
            `0x${methods["createContract(bytes)"]}${simpleSol}`,
            {}
          );
          const zeroNonceGeneratedAddress = await callContract(
            `0x${methods["createContract(bytes)"]}${simpleSol}`,
            { [contractAddress]: { nonce: "0x0" } }
          );
          const encodedContractAddress = encodeValue(contractAddress2);
          const tests = {
            balance: {
              junks: [
                {
                  junk: null,
                  expectedValue:
                    "0x00000000000000000000000000000000000000000000003635c9adc5dea00000"
                },
                {
                  junk: undefined,
                  expectedValue:
                    "0x00000000000000000000000000000000000000000000003635c9adc5dea00000"
                },
                {
                  junk: "",
                  expectedValue:
                    "0x0000000000000000000000000000000000000000000000000000000000000000"
                },
                {
                  junk: "123",
                  error: `Cannot wrap string value "123" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  junk: {},
                  error: `Cannot wrap a "object" as a json-rpc type`
                },
                {
                  junk: "0xa string",
                  error: `Cannot wrap string value "0xa string" as a json-rpc type; the input value contains an invalid hex character.`
                },
                {
                  junk: -9,
                  error: "Cannot wrap a negative value as a json-rpc type"
                },
                {
                  junk: "0x",
                  error: `Cannot wrap "0x" as a json-rpc Quantity type; strings must contain at least one hexadecimal character.`
                }
              ],
              contractMethod: `0x${methods["getBalance(address)"]}${encodedAddr}`
            },
            code: {
              junks: [
                {
                  junk: null,
                  expectedValue: (actual: string) => {
                    // maybe a bit lazy, but the "actual" will be encoded further,
                    // but if it includes this byteCode, it's probably safe
                    return actual.includes(
                      contract.contract.evm.deployedBytecode.object
                    );
                  }
                },
                {
                  junk: undefined,
                  expectedValue: (actual: string) => {
                    // maybe a bit lazy, but the "actual" will be encoded further,
                    // but if it includes this byteCode, it's probably safe
                    return actual.includes(
                      contract.contract.evm.deployedBytecode.object
                    );
                  }
                },
                {
                  junk: "",
                  expectedValue:
                    "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000"
                },
                {
                  junk: "0x",
                  expectedValue:
                    "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000"
                },
                {
                  junk: "123",
                  error: `Cannot wrap string value "123" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  junk: {},
                  error: `Cannot wrap a "object" as a json-rpc type`
                },
                {
                  junk: "0xa string",
                  error: `Cannot wrap string value "0xa string" as a json-rpc type; the input value contains an invalid hex character.`
                },
                {
                  junk: -9,
                  error: "Cannot wrap a negative value as a json-rpc type"
                }
              ],
              contractMethod: `0x${methods["getCode(address)"]}${encodedContractAddress}`
            },
            stateDiff: {
              junks: [
                {
                  junk: null,
                  error: `StateDiff override data not valid. Received: null`,
                  expectedValue: null
                },
                {
                  junk: undefined,
                  error: `StateDiff override data not valid. Received: undefined`
                },
                {
                  junk: "",
                  error: `Cannot wrap string value "" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  junk: "0x",
                  error: `StateDiff override data must be a 64 character hex string. Received 0 character string.`
                },
                {
                  junk: "0xbaddad42",
                  error: `StateDiff override data must be a 64 character hex string. Received 8 character string.`
                },
                {
                  junk: "123",
                  error: `Cannot wrap string value "123" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  junk: {},
                  error: `Cannot wrap a "object" as a json-rpc type`
                },
                {
                  junk: "0xnothexnothexnothexnothexnothexnothexnothexnothexnothexnothexnoth",
                  error: `Cannot wrap string value "0xnothexnothexnothexnothexnothexnothexnothexnothexnothexnothexnoth" as a json-rpc type; the input value contains an invalid hex character.`
                },
                {
                  junk: -9,
                  error: "Cannot wrap a negative value as a json-rpc type"
                },
                {
                  junk: "0x",
                  error:
                    "StateDiff override data must be a 64 character hex string. Received 0 character string."
                }
              ],
              contractMethod: `0x${methods["getStorageAt(uint256)"]}${slot}`
            },
            state: {
              junks: [
                {
                  junk: null,
                  error: `State override data not valid. Received: null`,
                  expectedValue: null
                },
                {
                  junk: undefined,
                  error: `State override data not valid. Received: undefined`
                },
                {
                  junk: "",
                  error: `Cannot wrap string value "" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  junk: "0x",
                  error: `State override data must be a 64 character hex string. Received 0 character string.`
                },
                {
                  junk: "0xbaddad42",
                  error: `State override data must be a 64 character hex string. Received 8 character string.`
                },
                {
                  junk: "123",
                  error: `Cannot wrap string value "123" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  junk: {},
                  error: `Cannot wrap a "object" as a json-rpc type`
                },
                {
                  // State override data must be 64 characters long in order to hit this validation
                  junk: "0xnothexnothexnothexnothexnothexnothexnothexnothexnothexnothexnoth",
                  error: `Cannot wrap string value "0xnothexnothexnothexnothexnothexnothexnothexnothexnothexnothexnoth" as a json-rpc type; the input value contains an invalid hex character.`
                },
                {
                  junk: -9,
                  error: "Cannot wrap a negative value as a json-rpc type"
                },
                {
                  junk: "0x",
                  error:
                    "State override data must be a 64 character hex string. Received 0 character string."
                }
              ],
              contractMethod: `0x${methods["getStorageAt(uint256)"]}${slot}`
            },
            stateDiffSlot: {
              junks: [
                {
                  junk: null,
                  error: `Cannot wrap string value "null" as a json-rpc type; strings must be prefixed with "0x".`,
                  expectedValue: null
                },
                {
                  junk: undefined,
                  error: `Cannot wrap string value "undefined" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  junk: "",
                  error: `Cannot wrap string value "" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  junk: "0x",
                  error: `StateDiff override slot must be a 64 character hex string. Received 0 character string.`
                },
                {
                  junk: "0xbaddad42",
                  error: `StateDiff override slot must be a 64 character hex string. Received 8 character string.`
                },
                {
                  junk: "123",
                  error: `Cannot wrap string value "123" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  junk: {},
                  error: `Cannot wrap string value "[object Object]" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  junk: "0xnothexnothexnothexnothexnothexnothexnothexnothexnothexnothexnoth",
                  error: `Cannot wrap string value "0xnothexnothexnothexnothexnothexnothexnothexnothexnothexnothexnoth" as a json-rpc type; the input value contains an invalid hex character.`
                },
                {
                  junk: -9,
                  error: `Cannot wrap string value "-9" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  junk: "0x",
                  error:
                    "StateDiff override slot must be a 64 character hex string. Received 0 character string."
                }
              ],
              contractMethod: `0x${methods["getStorageAt(uint256)"]}${slot}`
            },
            stateSlot: {
              junks: [
                {
                  junk: null,
                  error: `Cannot wrap string value "null" as a json-rpc type; strings must be prefixed with "0x".`,
                  expectedValue: null
                },
                {
                  junk: undefined,
                  error: `Cannot wrap string value "undefined" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  junk: "",
                  error: `Cannot wrap string value "" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  junk: "0x",
                  error: `State override slot must be a 64 character hex string. Received 0 character string.`
                },
                {
                  junk: "0xbaddad42",
                  error: `State override slot must be a 64 character hex string. Received 8 character string.`
                },
                {
                  junk: "123",
                  error: `Cannot wrap string value "123" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  junk: {},
                  error: `Cannot wrap string value "[object Object]" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  // State override must be 64 characters long in order to hit this validation
                  junk: "0xnothexnothexnothexnothexnothexnothexnothexnothexnothexnothexnoth",
                  error: `Cannot wrap string value "0xnothexnothexnothexnothexnothexnothexnothexnothexnothexnothexnoth" as a json-rpc type; the input value contains an invalid hex character.`
                },
                {
                  junk: -9,
                  error: `Cannot wrap string value "-9" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  junk: "0x",
                  error: `State override slot must be a 64 character hex string. Received 0 character string.`
                }
              ],
              contractMethod: `0x${methods["getStorageAt(uint256)"]}${slot}`
            },
            nonce: {
              junks: [
                {
                  junk: null,
                  expectedValue: currentNonceGeneratedAddress
                },
                {
                  junk: undefined,
                  expectedValue: currentNonceGeneratedAddress
                },
                {
                  junk: "",
                  expectedValue: zeroNonceGeneratedAddress
                },
                {
                  junk: "123",
                  error: `Cannot wrap string value "123" as a json-rpc type; strings must be prefixed with "0x".`
                },
                {
                  junk: {},
                  error: `Cannot wrap a "object" as a json-rpc type`
                },
                {
                  junk: "0xa string",
                  error: `Cannot wrap string value "0xa string" as a json-rpc type; the input value contains an invalid hex character.`
                },
                {
                  junk: -9,
                  error: "Cannot wrap a negative value as a json-rpc type"
                },
                {
                  junk: "0x",
                  error: `Cannot wrap "0x" as a json-rpc Quantity type; strings must contain at least one hexadecimal character.`
                }
              ],
              contractMethod: `0x${methods["createContract(bytes)"]}${simpleSol}`
            }
          };

          const getOverrideForType = (type: string, junk: any) => {
            switch (type) {
              case "balance":
                return { [addr]: { [type]: junk } };
              case "code":
                return { [contractAddress2]: { [type]: junk } };
              case "nonce":
                return { [contractAddress]: { [type]: junk } };
              case "state":
              case "stateDiff":
                return {
                  [contractAddress]: { [type]: { [`0x${slot}`]: junk } }
                };
              case "stateSlot":
                return {
                  [contractAddress]: { state: { [junk]: data } }
                };
              case "stateDiffSlot":
                return {
                  [contractAddress]: { stateDiff: { [junk]: data } }
                };
              default:
                return {};
            }
          };

          for (const [type, { contractMethod, junks }] of Object.entries(
            tests
          )) {
            for (const { junk, error, expectedValue } of junks) {
              const override = getOverrideForType(type, junk);
              const prom = callContract(contractMethod, override);
              if (error) {
                await assert.rejects(
                  prom,
                  new Error(error),
                  `Failed junk data validation for "${type}" override type with value "${junk}". Expected error: ${error}`
                );
              } else {
                if (typeof expectedValue === "string") {
                  assert.strictEqual(
                    await prom,
                    expectedValue,
                    `Failed junk data validation for "${type}" override type with value "${junk}".`
                  );
                } else {
                  assert(
                    expectedValue(await prom),
                    `Failed junk data validation for "${type}" override type with value "${junk}".`
                  );
                }
              }
            }
          }
        });
      });

      describe("changes are ephemeral", () => {
        let wallet: Wallet;
        let blockchain: Blockchain;
        let from: string, to: string;
        let simTx: SimulationTransaction;
        let parentBlock: Block;
        let gas: Quantity;
        let ethereumJsFromAddress: EthereumJsAddress,
          ethereumJsToAddress: EthereumJsAddress;
        let transaction: LegacyRpcTransaction;
        let privateKey: Data;

        before(async () => {
          const options = EthereumOptionsConfig.normalize({
            logging: { quiet: true }
          });
          wallet = new Wallet(options.wallet);
          [from, to] = wallet.addresses;
          blockchain = new Blockchain(
            options,
            new Address(wallet.addresses[0])
          );
          await blockchain.initialize(wallet.initialAccounts);

          // set up a simulation transaction
          parentBlock = blockchain.blocks.latest;
          const parentHeader = parentBlock.header;
          gas = Quantity.from("0xfffff");
          const block = new RuntimeBlock(
            parentHeader.number,
            parentHeader.parentHash,
            blockchain.coinbase,
            gas.toBuffer(),
            parentHeader.gasUsed.toBuffer(),
            parentHeader.timestamp,
            Quantity.One, // difficulty
            parentHeader.totalDifficulty,
            parentHeader.baseFeePerGas.toBigInt()
          );
          simTx = {
            from: new Address(from),
            to: new Address(to),
            gas,
            gasPrice: Quantity.from("0xfffffffffff"),
            value: Quantity.from("0xffff"),
            data: Data.from("0xabcdef1234"),
            block: block
          };
          ethereumJsFromAddress = new EthereumJsAddress(
            Quantity.toBuffer(from)
          );
          ethereumJsToAddress = new EthereumJsAddress(Quantity.toBuffer(to));
          // set up a real transaction
          transaction = {
            from,
            to,
            gas: gas.toString(),
            gasPrice: "0xfffffffffff",
            value: "0xffff",
            data: "0xabcdef1234"
          };
          privateKey = wallet.unlockedAccounts.get(from);
        });

        const getDbData = async (trie: GanacheTrie) => {
          let dbData: (string | Buffer)[] = [];
          for await (const data of trie.db._leveldb.createReadStream()) {
            dbData.push(data);
          }
          return dbData;
        };

        const getBlockchainState = async () => {
          const trie = blockchain.trie.copy(true);
          const trieDbData = await getDbData(trie);
          const vm = await blockchain.createVmFromStateTrie(
            trie,
            false,
            blockchain.common
          );
          const fromState = await vm.stateManager.getAccount(
            ethereumJsFromAddress
          );
          const toState = await vm.stateManager.getAccount(ethereumJsToAddress);
          return { root: trie.root, db: trieDbData, fromState, toState };
        };

        it("does not persist changes to vm or state trie", async () => {
          // copy the trie, its database, the vm, and the accounts
          const before = await getBlockchainState();

          // simulate the transaction
          await blockchain.simulateTransaction(simTx, parentBlock, {});

          // copy the trie, its database, the vm, and the accounts again for comparison
          const after = await getBlockchainState();

          // simulating a transaction does not change any of the data
          assert.deepStrictEqual(before, after);

          // as a sanity check, confirm sending a real transaction does alter state
          await blockchain.queueTransaction(
            TransactionFactory.fromRpc(transaction, blockchain.common),
            privateKey
          );
          // wait for that new block to be mined
          await blockchain.once("block");

          // copy the trie, its database, the vm, and the accounts again for comparison
          const afterTx = await getBlockchainState();

          // simulating a transaction does change the trie root, db and VM accounts
          assert.notDeepStrictEqual(before, afterTx);
        });

        it("does not persist changes to vm or state trie when overrides are set", async () => {
          // copy the trie, its database, the vm, and the accounts
          const before = await getBlockchainState();

          // simulate the transaction, also setting overrides
          const overrides = {
            [from]: { balance: "0x0", nonce: "0xfff", code: "0x12345678" }
          };
          await blockchain.simulateTransaction(simTx, parentBlock, overrides);

          // copy the trie, its database, the vm, and the accounts again for comparison
          const after = await getBlockchainState();

          // simulating a transaction with overrides does not change the trie or VM accounts
          assert.deepStrictEqual(before, after);

          // as a sanity check, confirm sending a real transaction does alter state
          await blockchain.queueTransaction(
            TransactionFactory.fromRpc(transaction, blockchain.common),
            privateKey
          );
          // wait for that new block to be mined
          await blockchain.once("block");

          // copy the trie, its database, the vm, and the accounts again for comparison
          const afterTx = await getBlockchainState();

          // simulating a transaction does change the trie root, db and VM accounts
          assert.notDeepStrictEqual(before, afterTx);
        });
      });
    });
  });
});
