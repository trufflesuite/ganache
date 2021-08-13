import assert from "assert";
import getProvider from "../../helpers/getProvider";
import compile from "../../helpers/compile";
import { join } from "path";
import EthereumProvider from "../../../src/provider";
import { EthereumProviderOptions } from "@ganache/ethereum-options";

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

            const gasEstimate = await provider.send("eth_estimateGas", [
              {
                from,
                to: from
              }
            ]);
            await provider.send("eth_subscribe", ["newHeads"]);

            const hash = await provider.send("eth_sendTransaction", [
              {
                from,
                to: from
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
                gas: `0x${(54400).toString(16)}` // 54400 is not quite enough gas for this tx
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
              if (opts.chain.vmErrorsOnRPCResponse) {
                const result = await prom.catch(e => e);
                assert.strictEqual(
                  result.code,
                  -32000,
                  "Error code should be -32000"
                );
                assert.strictEqual(
                  result.data.reason,
                  null,
                  "The reason is undecodable, and thus should be null"
                );
                assert.strictEqual(
                  result.data.message,
                  "revert",
                  "The message should not have a reason string included"
                );
                assert.strictEqual(
                  result.data.result,
                  revertString,
                  "The revert reason should be encoded as hex"
                );
              } else {
                assert.strictEqual(
                  await prom,
                  revertString,
                  "The revert reason should be encoded as hex"
                );
              }
            }
            await test({ chain: { vmErrorsOnRPCResponse: false } });
            await test({ chain: { vmErrorsOnRPCResponse: true } });
          });
        });
      });
    });
  });
});
