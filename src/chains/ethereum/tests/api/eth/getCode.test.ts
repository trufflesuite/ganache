import assert from "assert";
import EthereumProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import compile from "../../helpers/compile";
import { join } from "path";
import { Quantity } from "@ganache/utils";

describe("api", () => {
  describe("eth", () => {
    describe("getCode", () => {
      describe("null checks", () => {
        let provider: EthereumProvider;

        before(async () => {
          provider = await getProvider();
        });

        after(async () => {
          provider && (await provider.disconnect());
        });

        it("should return 0x for null address", async () => {
          const code = await provider.send("eth_getCode", [
            "0x0000000000000000000000000000000000000000"
          ]);
          assert.strictEqual(code, "0x");
        });

        it("should return 0x for un-initialized address", async () => {
          const code = await provider.send("eth_getCode", [
            "0xabcdefg012345678abcdefg012345678abcdefg0"
          ]);
          assert.strictEqual(code, "0x");
        });

        it("should return 0x for existing non-contract address", async () => {
          const accounts = await provider.send("eth_accounts");
          const code = await provider.send("eth_getCode", [accounts[0]]);
          assert.strictEqual(code, "0x");
        });
      });

      describe("code checks", () => {
        let provider: EthereumProvider;
        let accounts: string[];
        let contractAddress: string;
        let blockNumber: Quantity;
        let contract: ReturnType<typeof compile>;

        before(async () => {
          contract = compile(join(__dirname, "./contracts/GetCode.sol"));
          provider = await getProvider();
          accounts = await provider.send("eth_accounts");
          await provider.send("eth_subscribe", ["newHeads"]);
          const transactionHash = await provider.send("eth_sendTransaction", [
            {
              from: accounts[0],
              data: contract.code,
              gas: 3141592
            }
          ]);
          await provider.once("message");
          const transactionReceipt = await provider.send(
            "eth_getTransactionReceipt",
            [transactionHash]
          );
          contractAddress = transactionReceipt.contractAddress;
          assert(
            contractAddress !== null,
            "Contract wasn't deployed as expected"
          );

          blockNumber = Quantity.from(transactionReceipt.blockNumber);
        });

        it("should return the code at the deployed block number", async () => {
          const code = await provider.send("eth_getCode", [
            contractAddress,
            blockNumber.toString()
          ]);
          assert.strictEqual(
            code,
            `0x${contract.contract.evm.deployedBytecode.object}`
          );
        });

        it("should return the no code at the previous block number", async () => {
          const code = await provider.send("eth_getCode", [
            contractAddress,
            Quantity.from(blockNumber.toBigInt() - 1n).toString()
          ]);
          assert.strictEqual(code, "0x");
        });
      });
    });
  });
});
