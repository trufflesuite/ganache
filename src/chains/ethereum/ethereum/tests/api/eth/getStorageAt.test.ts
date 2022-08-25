import getProvider from "../../helpers/getProvider";
import assert from "assert";
import { EthereumProvider } from "../../../src/provider";
import compile, { CompileOutput } from "../../helpers/compile";
import { join } from "path";

describe("api", () => {
  describe("eth", () => {
    describe("getStorageAt", () => {
      let provider: EthereumProvider;
      let contract: CompileOutput;
      // we can preset the contract address because we have the wallet in
      // deterministic mode. this allows us to get the storage at the contract
      // address for the pending block before the contract is actually
      // deployed
      let contractAddress = "0xe78a0f7e598cc8b0bb87894b0f60dd2a88d6a8ab";
      let contractMethods: any;
      let pendingStorage0: string, pendingStorage1: string;

      before(() => {
        contract = compile(join(__dirname, "./contracts/GetStorageAt.sol"));
      });

      beforeEach(async () => {
        provider = await getProvider({
          miner: { defaultTransactionGasLimit: 6721975 },
          wallet: { deterministic: true }
        });
        const accounts = await provider.send("eth_accounts");
        const from = accounts[0];

        await provider.send("miner_stop");
        await provider.send("eth_subscribe", ["newHeads"]);

        const transactionHash = await provider.send("eth_sendTransaction", [
          {
            from,
            data: contract.code
          }
        ]);
        pendingStorage0 = await provider.send("eth_getStorageAt", [
          contractAddress,
          "0x0",
          "pending"
        ]);
        pendingStorage1 = await provider.send("eth_getStorageAt", [
          contractAddress,
          "0x1",
          "pending"
        ]);
        await provider.send("miner_start");
        await provider.once("message");

        const receipt = await provider.send("eth_getTransactionReceipt", [
          transactionHash
        ]);

        assert.strictEqual(
          contractAddress,
          receipt.contractAddress,
          "Deployed contract address is not the expected address."
        );
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
        assert.strictEqual(
          result2,
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("returns the value at the hex position when 'pending' tag is passed, before the contract is deployed", async () => {
        assert.strictEqual(
          BigInt(pendingStorage0),
          123n,
          "Unexpected storage value for key 0 in pending block."
        );
        assert.strictEqual(
          pendingStorage1,
          "0x01",
          "Unexpected storage value for key 1 in pending block."
        );
      });

      it("returns the value at the 32-byte hex position", async () => {
        const result = await provider.send("eth_getStorageAt", [
          contractAddress,
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        ]);
        assert.strictEqual(BigInt(result), 123n);
        const result2 = await provider.send("eth_getStorageAt", [
          contractAddress,
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        ]);
        assert.strictEqual(
          result2,
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
      });

      it("returns the value even when hex positions exceeds 32-bytes", async () => {
        const thirtyThreeBytePosition =
          "0x10000000000000000000000000000000000000000000000000000000000000000";
        const result = await provider.send("eth_getStorageAt", [
          contractAddress,
          thirtyThreeBytePosition
        ]);
        assert.strictEqual(BigInt(result), 123n);
        const thirtyThreeBytePosition2 =
          "0x00000000000000000000000000000000000000000000000000000000000000001";
        const result2 = await provider.send("eth_getStorageAt", [
          contractAddress,
          thirtyThreeBytePosition2
        ]);
        assert.strictEqual(
          result2,
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        );
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
