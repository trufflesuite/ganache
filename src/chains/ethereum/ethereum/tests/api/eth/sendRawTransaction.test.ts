import getProvider from "../../helpers/getProvider";
import assert from "assert";
import EthereumProvider from "../../../src/provider";
import Transaction from "@ethereumjs/tx/dist/legacyTransaction";
import Common from "@ethereumjs/common";
import { join } from "path";
import compile from "../../helpers/compile";
import { EthereumProviderOptions } from "@ganache/ethereum-options";

describe("api", () => {
  describe("eth", () => {
    describe("eth_sendRawTransaction*", () => {
      let secretKey =
        "0x4c3fc38239e503913706205746ef2dcc54a5ea9971988bfcac136b43e3190841";
      let provider: EthereumProvider;
      let accounts: string[];
      const common = Common.forCustomChain(
        "mainnet",
        {
          name: "ganache",
          chainId: 1337,
          comment: "Local test network",
          bootstrapNodes: []
        },
        "petersburg"
      );
      beforeEach(async () => {
        provider = await getProvider({
          wallet: {
            mnemonic: "sweet treat",
            accounts: [{ secretKey, balance: "0xffffff" }]
          }
        });
        accounts = await provider.send("eth_accounts");
      });
      async function signAndSendRaw(tx: Object, passedProvider?: EthereumProvider) {
          if(passedProvider !== undefined) {
            provider = passedProvider;
          }
          const transaction = Transaction.fromTxData(tx, { common });
          const secretKeyBuffer = Buffer.from(secretKey.substr(2), "hex");
          const signed = transaction.sign(secretKeyBuffer);

          await provider.send("eth_subscribe", ["newHeads"]);
          const txHash = await provider.send("eth_sendRawTransaction", [
            signed.serialize()
          ]);
          await provider.once("message");

          const receipt = await provider.send("eth_getTransactionReceipt", [
            txHash
          ]);
          return [receipt, txHash];
      }
      describe("options", () => {
        it("processes a signed transaction", async () => {
          const [receipt, txHash] = await signAndSendRaw({
            value: "0xff",
            gasLimit: "0x33450",
            to: accounts[0]
          });
          assert.strictEqual(receipt.transactionHash, txHash);
        });
      });

      describe("contracts", () => {
        const contractDir = join(__dirname, "contracts");
        describe("out of gas", () => {
          it('returns `"0x0"` `status`, `null` `to`, and a non-empty `contractAddress` on OOG failure', async () => {
            const { code: data } = compile(join(contractDir, "NoOp.sol"));

            const [receipt] = await signAndSendRaw({
              data,
              gasLimit: 60000
            });
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
            const [receipt] = await signAndSendRaw({
              from: accounts[0],
              data: contract.code,
              gasLimit: 3141592
            }, provider);
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
