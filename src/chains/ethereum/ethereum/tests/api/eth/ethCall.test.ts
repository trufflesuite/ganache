import assert from "assert";
import getProvider from "../../helpers/getProvider";
import compile from "../../helpers/compile";
import { join } from "path";
import EthereumProvider from "../../../src/provider";
import { simpleEncode, rawEncode } from "ethereumjs-abi";

describe("api", () => {
  describe("eth", () => {
    describe("eth_call", () => {
      const testAddress = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      let provider: EthereumProvider;
      let accounts: string[];

      async function deployContract() {
        const contractDir = join(__dirname, "contracts");
        const contract = compile(join(contractDir, "Inspector.sol"));
        const from = accounts[0];

        await provider.send("eth_subscribe", ["newHeads"]);
        const transactionHash = await provider.send("eth_sendTransaction", [
          {
            from,
            data: contract.code,
            gas: 3141592
          } as any
        ]);
        await provider.once("message");

        const receipt = await provider.send("eth_getTransactionReceipt", [
          transactionHash
        ]);
        assert.strictEqual(receipt.blockNumber, "0x1");

        return receipt.contractAddress;
      }

      let contractAddress: string;
      beforeEach(async () => {
        provider = await getProvider({
          chain: { vmErrorsOnRPCResponse: true }
        });
        accounts = await provider.send("eth_accounts");
        contractAddress = await deployContract();
      });

      async function getTestBalance(overrides) {
        const data = `0x${simpleEncode(
          "getBalance(address)",
          testAddress
        ).toString("hex")}`;

        return await provider.send("eth_call", [
          {
            from: accounts[0],
            to: contractAddress,
            data
          },
          "latest",
          { [testAddress]: overrides }
        ]);
      }

      async function getTestCode(overrides) {
        const data = `0x${simpleEncode(
          "getCode(address)",
          testAddress
        ).toString("hex")}`;

        return await provider.send("eth_call", [
          {
            from: accounts[0],
            to: contractAddress,
            data
          },
          "latest",
          { [testAddress]: overrides }
        ]);
      }

      it("allows override of account code", async () => {
        assert.strictEqual(
          await getTestCode({ code: "0x123456" }),
          "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000031234560000000000000000000000000000000000000000000000000000000000"
        );
      });

      it("allows override of account balance", async () => {
        assert.strictEqual(
          await getTestBalance({ balance: "0x1e240" }),
          `0x${rawEncode(["uint256"], [123456]).toString("hex")}`
        );
      });

      it("does not persist overrides", async () => {
        // Simulate an unrelated call with overrides.
        await provider.send("eth_call", [
          {
            from: accounts[0],
            to: accounts[0]
          },
          "latest",
          {
            [testAddress]: {
              balance: "0x1e240",
              code: "0x123456"
            }
          }
        ]);

        // The overrides should not have persisted.
        const rawEmptyBytesEncoded =
          "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000";
        assert.strictEqual(await getTestCode({}), rawEmptyBytesEncoded);
        assert.strictEqual(
          await getTestBalance({}),
          `0x${rawEncode(["uint256"], [0]).toString("hex")}`
        );
      });
    });
  });
});
