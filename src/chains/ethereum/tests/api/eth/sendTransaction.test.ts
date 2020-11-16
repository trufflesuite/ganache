import assert from "assert";
import getProvider from "../../helpers/getProvider";
import compile from "../../helpers/compile";
import { join } from "path";
import EthereumProvider from "../../../src/provider";
import { EthereumProviderOptions } from "../../../src/options";

describe("api", () => {
  describe("eth", () => {
    describe("sendTransaction", () => {
      describe("contracts", () => {
        describe("revert", () => {
          async function deployContract(
            provider: EthereumProvider,
            accounts: string[]
          ) {
            const contract = compile(
              join(__dirname, "./contracts/Reverts.sol")
            );

            const from = accounts[0];

            await provider.send("eth_subscribe", ["newHeads"]);

            const transactionHash = await provider.send("eth_sendTransaction", [
              {
                from,
                data: contract.code,
                gas: 3141592
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
