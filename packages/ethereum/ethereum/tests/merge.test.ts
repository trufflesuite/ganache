import assert from "assert";
import { join } from "path";
import { EthereumProvider } from "../src/provider";
import compile from "./helpers/compile";
import getProvider from "./helpers/getProvider";

describe("merge", () => {
  let provider: EthereumProvider;
  let accounts: string[];
  beforeEach("get provider", async () => {
    provider = await getProvider({
      wallet: { seed: "temet nosce" },
      chain: { hardfork: "merge" }
    });
    accounts = await provider.send("eth_accounts");
  });
  describe("safe", () => {
    it("returns the safe block", async () => {
      const safe = await provider.send("eth_getBlockByNumber", ["safe", true]);
      const latest = await provider.send("eth_getBlockByNumber", [
        "latest",
        true
      ]);
      assert.deepStrictEqual(safe, latest);
    });
  });
  describe("finalized", () => {
    it("returns the finalized block", async () => {
      const finalized = await provider.send("eth_getBlockByNumber", [
        "finalized",
        true
      ]);
      const latest = await provider.send("eth_getBlockByNumber", [
        "latest",
        true
      ]);
      assert.deepStrictEqual(finalized, latest);
    });
  });

  describe("difficulty", () => {
    let contract: ReturnType<typeof compile>;
    let contractAddress: string;
    beforeEach("deploy contract", async () => {
      contract = compile(join(__dirname, "./contracts/Merge.sol"));
      const transaction = {
        from: accounts[0],
        data: contract.code,
        gasLimit: "0x2fefd8"
      };
      const txHash = await provider.send("eth_sendTransaction", [transaction]);
      const receipt = await provider.send("eth_getTransactionReceipt", [
        txHash
      ]);
      contractAddress = receipt.contractAddress;
    });
    it("uses the block's mixhash value as the PREVRANDAO opcode", async () => {
      const block = await provider.send("eth_getBlockByNumber", [
        "latest",
        false
      ]);
      assert.strictEqual(block.difficulty, "0x0");

      const constructorResult = await provider.send("eth_call", [
        {
          from: accounts[0],
          to: contractAddress,
          data: `0x${contract.contract.evm.methodIdentifiers["difficulty()"]}`
        },
        block.number
      ]);

      const txHash = await provider.send("eth_sendTransaction", [
        {
          from: accounts[0],
          to: contractAddress,
          gasLimit: "0x2fefd8",
          data: `0x${contract.contract.evm.methodIdentifiers["getCurrentDifficulty()"]}`
        }
      ]);
      const receipt = await provider.send("eth_getTransactionReceipt", [
        txHash
      ]);
      // make sure it didn't revert, which it will do if `difficulty` is not > `1`
      assert.strictEqual(receipt.status, "0x1");

      const viewResult1 = await provider.send("eth_call", [
        {
          from: accounts[0],
          to: contractAddress,
          data: `0x${contract.contract.evm.methodIdentifiers["getCurrentDifficulty()"]}`
        },
        block.number
      ]);

      // it shouldn't be all 0s for the merge:
      assert.notStrictEqual(
        block.mixHash,
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );

      // the results should match
      assert.strictEqual(constructorResult, block.mixHash);
      assert.strictEqual(viewResult1, block.mixHash);

      const lastblock = await provider.send("eth_getBlockByNumber", [
        receipt.blockNumber,
        false
      ]);
      assert.strictEqual(lastblock.difficulty, "0x0");
      const viewResult2 = await provider.send("eth_call", [
        {
          from: accounts[0],
          to: contractAddress,
          data: `0x${contract.contract.evm.methodIdentifiers["getCurrentDifficulty()"]}`
        },
        "latest"
      ]);
      // it changed
      assert.notStrictEqual(viewResult1, viewResult2);
      assert.strictEqual(viewResult2, lastblock.mixHash);
    });
  });
});
