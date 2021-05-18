import assert from "assert";
import getProvider from "../../helpers/getProvider";
import compile from "../../helpers/compile";
import { join } from "path";
import EthereumProvider from "../../../src/provider";
import { simpleEncode, rawEncode } from "ethereumjs-abi";

describe("api", () => {
  describe("eth", () => {
    describe("sendTransaction", () => {
      describe("options", () => {
        const testAddress = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        const contractDir = join(__dirname, "contracts");
        async function deployContract(
          provider: EthereumProvider,
          accounts: string[]
        ) {
          const contract = compile(join(contractDir, "Inspector.sol"));

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

        it("allows override of account code", async () => {
          const provider = await getProvider({
            chain: { vmErrorsOnRPCResponse: true }
          });
          const accounts = await provider.send("eth_accounts");
          const { contractAddress } = await deployContract(provider, accounts);

          const data = `0x${simpleEncode(
            "getCode(address)",
            testAddress
          ).toString("hex")}`;

          const result = await provider.send("eth_call", [
            {
              from: accounts[0],
              to: contractAddress,
              data
            },
            "latest",
            { [testAddress]: { code: "0x123456" } }
          ]);

          assert.strictEqual(
            result,
            "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000031234560000000000000000000000000000000000000000000000000000000000"
          );
        });

        it("allows override of account balance", async () => {
          const provider = await getProvider({
            chain: { vmErrorsOnRPCResponse: true }
          });
          const accounts = await provider.send("eth_accounts");
          const { contractAddress } = await deployContract(provider, accounts);

          const data = `0x${simpleEncode(
            "getBalance(address)",
            testAddress
          ).toString("hex")}`;

          const result = await provider.send("eth_call", [
            {
              from: accounts[0],
              to: contractAddress,
              data
            },
            "latest",
            { [testAddress]: { balance: "0x1e240" } }
          ]);

          assert.strictEqual(
            result,
            `0x${rawEncode(["uint256"], [123456]).toString("hex")}`
          );
        });

        it("does not persist overrides", async () => {
          const provider = await getProvider({
            chain: { vmErrorsOnRPCResponse: true }
          });
          const accounts = await provider.send("eth_accounts");
          const { contractAddress } = await deployContract(provider, accounts);

          const data = `0x${simpleEncode(
            "getCode(address)",
            testAddress
          ).toString("hex")}`;

          const result = await provider.send("eth_call", [
            {
              from: accounts[0],
              to: contractAddress,
              data
            },
            "latest"
          ]);

          const rawEmptyBytesEncoded =
            "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000";
          assert.strictEqual(result, rawEmptyBytesEncoded);
        });
      });
    });
  });
});
