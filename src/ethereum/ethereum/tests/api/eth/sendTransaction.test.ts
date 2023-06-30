import assert from "assert";
import getProvider from "../../helpers/getProvider";
import compile from "../../helpers/compile";
import { join } from "path";
import { EthereumProvider } from "../../../src/provider";
import {
  EthereumOptionsConfig,
  EthereumProviderOptions
} from "@ganache/ethereum-options";
import Wallet from "../../../src/wallet";
import { SECP256K1_N } from "@ganache/secp256k1";
import { Data, Quantity } from "@ganache/utils";

describe("api", () => {
  describe("eth", () => {
    describe("sendTransaction", () => {
      describe("options", () => {
        describe("defaultTransactionGasLimit", () => {
          it('uses an estimate when `defaultTransactionGasLimit` is set to `"estimate"`', async () => {
            const provider = await getProvider({
              miner: {
                defaultTransactionGasLimit: "estimate"
              }
            });
            const [from] = await provider.send("eth_accounts");

            const gasPrice = await provider.send("eth_gasPrice", []);
            const gasEstimate = await provider.send("eth_estimateGas", [
              {
                from,
                to: from,
                gasPrice
              }
            ]);
            await provider.send("eth_subscribe", ["newHeads"]);

            const hash = await provider.send("eth_sendTransaction", [
              {
                from,
                to: from,
                gasPrice
              }
            ]);

            await provider.once("message");

            const { gas } = await provider.send("eth_getTransactionByHash", [
              hash
            ]);
            assert.strictEqual(gas, gasEstimate);
          });
        });
      });

      describe("insufficient funds", () => {
        const types = ["0x0", "0x1", "0x2"] as const;
        it("returns a VM error when the account has insufficient funds to transfer the value at runtime", async () => {
          const approximateGasCost = 99967968750001;
          const provider = await getProvider({
            miner: { instamine: "eager" },
            chain: { vmErrorsOnRPCResponse: true }
          });
          const accounts = await provider.send("eth_accounts");
          const to = accounts.pop();
          const getBalance = acct => provider.send("eth_getBalance", [acct]);
          const sendTx = tx => provider.send("eth_sendTransaction", [tx]);
          for (let i = 0; i < types.length; i++) {
            const snapshot = await provider.send("evm_snapshot");
            try {
              const from = accounts[i];
              const balance = parseInt(await getBalance(from), 16);
              // fire a transaction without awaiting it in order to spend some
              // gas
              const tx = { type: types[i], from, to };
              sendTx(tx);
              await assert.rejects(
                sendTx({
                  ...tx,
                  // attempt to zero out the account. this tx will fail because
                  // the previous (pending transaction) will spend some of its
                  // balance, not leaving enough left over for this transaction.
                  value: `0x${(balance - approximateGasCost).toString(16)}`
                }),
                new RegExp(
                  `VM Exception while processing transaction: sender doesn't have enough funds to send tx\\. The upfront cost is: \\d+ and the sender's account \\(${from}\\) only has: \\d+ \\(vm hf=shanghai -> block -> tx\\)`
                )
              );
            } finally {
              await provider.send("evm_revert", [snapshot]);
            }
          }
        });

        it("returns an `insufficient funds` error when the account doesn't have enough funds to send the transaction", async () => {
          const provider = await getProvider();
          const [from, to] = await provider.send("eth_accounts");
          const getBalance = acct => provider.send("eth_getBalance", [acct]);
          for (let i = 0; i < types.length; i++) {
            const tx = {
              type: types[i],
              from,
              to,
              value: await getBalance(from)
            };
            await assert.rejects(provider.send("eth_sendTransaction", [tx]), {
              message: "insufficient funds for gas * price + value",
              code: -32003
            });
          }
        });
      });

      describe("contracts", () => {
        const contractDir = join(__dirname, "contracts");
        describe("out of gas", () => {
          let provider: EthereumProvider;
          let from: string;
          beforeEach(async () => {
            provider = await getProvider();
            [from] = await provider.send("eth_accounts");
          });

          it('returns `"0x0"` `status`, `null` `to`, and a non-empty `contractAddress` on OOG failure', async () => {
            const { code: data } = compile(join(contractDir, "NoOp.sol"));

            await provider.send("eth_subscribe", ["newHeads"]);

            const transactionHash = await provider.send("eth_sendTransaction", [
              {
                from,
                data,
                // 55555 is enough gas to cover intrinsic gas, but not enough
                // to actually deploy the contract.
                gas: `0x${(55555).toString(16)}`
              }
            ]);

            await provider.once("message");

            const receipt = await provider.send("eth_getTransactionReceipt", [
              transactionHash
            ]);
            assert.strictEqual(receipt.status, "0x0");
            // ensure that even though the status is `"0x0"` (failure), the
            // `contractAddress` is included and the `to` prop is still `null`.
            assert.strictEqual(receipt.to, null);
            assert.notStrictEqual(receipt.contractAddress, null);
            assert.strictEqual(receipt.contractAddress.length, 42);
          });
        });

        describe("revert", () => {
          async function deployContract(
            provider: EthereumProvider,
            accounts: string[]
          ) {
            const contract = compile(join(contractDir, "Reverts.sol"));

            const from = accounts[0];

            await provider.send("eth_subscribe", ["newHeads"]);

            const transactionHash = await provider.send("eth_sendTransaction", [
              {
                from,
                data: contract.code,
                gas: "0x2fefd8"
              }
            ]);

            await provider.once("message");

            const receipt = await provider.send("eth_getTransactionReceipt", [
              transactionHash
            ]);
            assert.strictEqual(receipt.blockNumber, "0x1");

            const contractAddress = receipt.contractAddress;
            return {
              contract,
              contractAddress
            };
          }

          it("doesn't crash on badly encoded revert string", async () => {
            async function test(opts: EthereumProviderOptions) {
              const provider = await getProvider(opts);
              const accounts = await provider.send("eth_accounts");
              const { contract, contractAddress } = await deployContract(
                provider,
                accounts
              );
              const contractMethods = contract.contract.evm.methodIdentifiers;
              const prom = provider.send("eth_call", [
                {
                  from: accounts[0],
                  to: contractAddress,
                  data: "0x" + contractMethods["invalidRevertReason()"]
                }
              ]);

              const revertString =
                "0x08c379a0ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc0";
              const result = await prom.catch(e => e);
              assert.strictEqual(
                result.code,
                -32000,
                "Error code should be -32000"
              );
              assert.strictEqual(
                result.message,
                "VM Exception while processing transaction: revert",
                "The message should not have a reason string included"
              );
              assert.strictEqual(
                result.data,
                revertString,
                "The revert reason should be encoded as hex"
              );
            }
            await test({});
          });
        });
      });

      describe("unlocked accounts", () => {
        it("can send transactions from an unlocked 0x0 address", async () => {
          const ZERO_ADDRESS = Data.toString("0x00", 20);
          const provider = await getProvider({
            miner: {
              defaultGasPrice: 0
            },
            wallet: {
              unlockedAccounts: [ZERO_ADDRESS]
            },
            chain: {
              // use berlin here because we just want to test if we can use the
              // "zero" address, and we do this by transferring value while
              // setting the gasPrice to `0`. This isn't possible after the
              // `london` hardfork currently, as we don't provide an option to
              // allow for a 0 `maxFeePerGas` value.
              // TODO: remove once we have a configurable `maxFeePerGas`
              hardfork: "berlin"
            }
          });
          const [from] = await provider.send("eth_accounts");
          await provider.send("eth_subscribe", ["newHeads"]);
          const initialZeroBalance = "0x1234";
          await provider.send("eth_sendTransaction", [
            { from: from, to: ZERO_ADDRESS, value: initialZeroBalance }
          ]);
          await provider.once("message");
          const initialBalance = await provider.send("eth_getBalance", [
            ZERO_ADDRESS
          ]);
          assert.strictEqual(
            initialBalance,
            initialZeroBalance,
            "Zero address's balance isn't correct"
          );
          const removeValueFromZeroAmount = "0x123";
          await provider.send("eth_sendTransaction", [
            { from: ZERO_ADDRESS, to: from, value: removeValueFromZeroAmount }
          ]);
          await provider.once("message");
          const afterSendBalance = BigInt(
            await provider.send("eth_getBalance", [ZERO_ADDRESS])
          );
          assert.strictEqual(
            BigInt(initialZeroBalance) - BigInt(removeValueFromZeroAmount),
            afterSendBalance,
            "Zero address's balance isn't correct"
          );
        });

        it("unlocks accounts via unlock_accounts (both string and numbered numbers)", async () => {
          const p = await getProvider({
            wallet: {
              lock: true,
              unlockedAccounts: ["0", 1]
            }
          });

          const accounts = await p.send("eth_accounts");
          const balance1_1 = await p.send("eth_getBalance", [accounts[1]]);
          const badSend = async () => {
            return p.send("eth_sendTransaction", [
              {
                from: accounts[2],
                to: accounts[1],
                value: "0x7b"
              }
            ]);
          };
          await assert.rejects(
            badSend,
            "Error: authentication needed: passphrase or unlock"
          );

          await p.send("eth_subscribe", ["newHeads"]);
          await p.send("eth_sendTransaction", [
            {
              from: accounts[0],
              to: accounts[1],
              value: "0x7b"
            }
          ]);

          await p.once("message");

          const balance1_2 = await p.send("eth_getBalance", [accounts[1]]);
          assert.strictEqual(BigInt(balance1_1) + 123n, BigInt(balance1_2));

          const balance0_1 = await p.send("eth_getBalance", [accounts[0]]);

          await p.send("eth_sendTransaction", [
            {
              from: accounts[1],
              to: accounts[0],
              value: "0x7b"
            }
          ]);

          await p.once("message");

          const balance0_2 = await p.send("eth_getBalance", [accounts[0]]);
          assert.strictEqual(BigInt(balance0_1) + 123n, BigInt(balance0_2));
        });

        it("generates an EIP-2 compliant private key", async () => {
          // https://eips.ethereum.org/EIPS/eip-2

          const options = EthereumOptionsConfig.normalize({});
          const wallet = new Wallet(options.wallet, options.logging);

          function makeKeys(address: string) {
            const addressBuf = Data.toBuffer(address);
            const pk = BigInt(wallet.createFakePrivateKey(address).toString());
            const naivePk = Quantity.from(
              Buffer.concat([addressBuf, addressBuf.slice(0, 12)])
            ).toBigInt();
            return { naivePk, pk };
          }

          // sanity test. the small key doesn't trigger the secp256k1 upper
          // limit
          const smallKey = makeKeys(
            "0xfffffffffffffffffffffffffffffffebaaedce5"
          );
          assert.strictEqual(smallKey.pk, smallKey.naivePk);
          assert(smallKey.pk < SECP256K1_N);

          // this is first (smallest) key that will trigger the secp256k1 upper
          // limit code path
          const largeKey = makeKeys(
            "0xfffffffffffffffffffffffffffffffebaaedce6"
          );
          assert.notStrictEqual(largeKey.pk, largeKey.naivePk);
          assert(largeKey.pk < SECP256K1_N);
        });
      });
    });
  });
});
