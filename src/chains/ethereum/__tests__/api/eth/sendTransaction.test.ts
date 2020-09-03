import assert from "assert";
import getProvider from "../../helpers/getProvider";
import compile from "../../helpers/compile";
import { join } from "path";
import EthereumProvider from "../../../src/provider";

describe("api", () => {
  describe("eth", () => {
    describe("sendTransaction", () => {
      describe("contracts", () => {
        describe("revert", () => {

          async function deployContract(provider: EthereumProvider, accounts: string[]) {
            const contract = compile(join(__dirname, "./contracts/Reverts.sol"));

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

            const receipt = await provider.send("eth_getTransactionReceipt", [transactionHash]);
            assert.strictEqual(receipt.blockNumber, "0x1");

            const contractAddress = receipt.contractAddress;
            return {
              contract,
              contractAddress
            };
          }

          it("doesn't crash on badly encoded revert string", async () => {
            const provider = await getProvider();
            const accounts = await provider.send("eth_accounts");
            const {contract, contractAddress} = await deployContract(provider, accounts);
            const contractMethods = contract.contract.evm.methodIdentifiers;
            const value = await provider.send("eth_call", [
              {from: accounts[0], to: contractAddress, data: "0x" + contractMethods["invalidRevertReason()"]}
            ]);
            assert.strictEqual(value, "0x08c379a0ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc0");
          });
        });
      });
    });
  });
});
