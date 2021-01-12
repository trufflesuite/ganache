import getProvider from "../../helpers/getProvider";
import assert from "assert";
import EthereumProvider from "../../../src/provider";
import compile from "../../helpers/compile";
import { join } from "path";
import { Quantity } from "@ganache/utils";
const THIRTY_TWO_BYES = "0".repeat(64);

describe("api", () => {
  describe("eth", () => {
    describe("getStorageAt", () => {
      let provider: EthereumProvider;
      const contract = compile(join(__dirname, "./contracts/GetStorageAt.sol"));
      let contractAddress: string;
      let contractMethods: any;

      beforeEach(async () => {
        provider = await getProvider({
          miner: { defaultTransactionGasLimit: 6721975 }
        });
        const accounts = await provider.send("eth_accounts");
        const from = accounts[0];

        await provider.send("eth_subscribe", ["newHeads"]);

        const transactionHash = await provider.send("eth_sendTransaction", [
          {
            from,
            data: contract.code
          }
        ]);

        await provider.once("message");

        const receipt = await provider.send("eth_getTransactionReceipt", [
          transactionHash
        ]);

        contractAddress = receipt.contractAddress;
        contractMethods = contract.contract.evm.methodIdentifiers;
      });

      it("returns the value at the hex position", async () => {
        const result = await provider.send("eth_getStorageAt", [
          contractAddress,
          "0x0"
        ]);
        assert.strictEqual(BigInt(result), 123n);
        const result2 = await provider.send("eth_getStorageAt", [
          contractAddress,
          "0x1"
        ]);
        assert.strictEqual(result2, "0x01");
      });

      it("returns the value at the 32-byte hex position", async () => {
        const result = await provider.send("eth_getStorageAt", [
          contractAddress,
          "0x" + THIRTY_TWO_BYES
        ]);
        assert.strictEqual(BigInt(result), 123n);
        const result2 = await provider.send("eth_getStorageAt", [
          contractAddress,
          "0x" + THIRTY_TWO_BYES.slice(-1) + "1"
        ]);
        assert.strictEqual(result2, "0x01");
      });

      it("returns the value even when hex positions exceeds 32-bytes", async () => {
        const thirtyThreeBytePosition = "0x1" + THIRTY_TWO_BYES;
        const result = await provider.send("eth_getStorageAt", [
          contractAddress,
          thirtyThreeBytePosition
        ]);
        assert.strictEqual(BigInt(result), 123n);
        const thirtyThreeBytePosition2 = "0x" + THIRTY_TWO_BYES + "1";
        const result2 = await provider.send("eth_getStorageAt", [
          contractAddress,
          thirtyThreeBytePosition2
        ]);
        assert.strictEqual(result2, "0x01");
      });

      it("rejects when the block doesn't exist", async () => {
        await assert.rejects(
          provider.send("eth_getStorageAt", [contractAddress, "0x0", "0x2"]),
          {
            message: "header not found"
          }
        );
      });
    });
  });
});
