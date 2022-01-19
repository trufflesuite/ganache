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
        let from: string;
        let contractAddress: string;
        let blockNumber: Quantity;
        let contract: ReturnType<typeof compile>;

        before(async () => {
          contract = compile(join(__dirname, "./contracts/GetCode.sol"), {
            contractName: "GetCode",
            imports: [join(__dirname, "./contracts/NoOp.sol")]
          });
          provider = await getProvider();
          [from] = await provider.send("eth_accounts");
          await provider.send("eth_subscribe", ["newHeads"]);
          const transactionHash = await provider.send("eth_sendTransaction", [
            {
              from,
              data: contract.code,
              gas: "0x2fefd8"
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

        describe("factory contract", () => {
          const context: {
            contractAddress?: string;
            expectedCode?: string;
          } = {};
          before(() => {
            context.contractAddress = contractAddress;
            context.expectedCode = `0x${contract.contract.evm.deployedBytecode.object}`;
          });
          testContractCode(context);
        });

        describe("factory-deployed contract", () => {
          const context: {
            contractAddress?: string;
            expectedCode?: string;
          } = {};
          before(async () => {
            const methods = contract.contract.evm.methodIdentifiers;
            const value = await provider.send("eth_call", [
              { from, to: contractAddress, data: "0x" + methods["noop()"] }
            ]);
            context.contractAddress = `0x${value.slice(2 + 64 - 40)}`; // 0x...000...{20-byte address}
            context.expectedCode = `0x${contract.imports["NoOp.sol"]["NoOp"].evm.deployedBytecode.object}`;
          });
          testContractCode(context);
        });

        function testContractCode(context: {
          contractAddress?: string;
          expectedCode?: string;
        }) {
          let contractAddress: string;
          let expectedCode: string;
          before(() => ({ contractAddress, expectedCode } = context));

          it("should return the code at the deployed block number", async () => {
            const code = await provider.send("eth_getCode", [
              contractAddress,
              blockNumber.toString()
            ]);
            assert.strictEqual(code, expectedCode);
          });

          it("should return the no code at the previous block number", async () => {
            const code = await provider.send("eth_getCode", [
              contractAddress,
              Quantity.from(blockNumber.toBigInt() - 1n).toString()
            ]);
            assert.strictEqual(code, "0x");
          });

          it("should return the code at the 'latest' block when `latest` and the deployed block number are the same", async () => {
            const code = await provider.send("eth_getCode", [
              contractAddress,
              "latest"
            ]);
            assert.strictEqual(code, expectedCode);

            const code2 = await provider.send("eth_getCode", [
              contractAddress
              // testing "latest" as default
            ]);
            assert.strictEqual(code2, expectedCode);
          });

          it("should return the code at the 'latest' block when the chain has progressed to new blocks", async () => {
            await provider.send("evm_mine");

            const latestBlockNumber = await provider.send("eth_blockNumber");

            assert.notStrictEqual(blockNumber.toString(), latestBlockNumber);

            const code = await provider.send("eth_getCode", [
              contractAddress,
              blockNumber.toString()
            ]);
            assert.strictEqual(code, expectedCode);

            const code2 = await provider.send("eth_getCode", [
              contractAddress,
              "latest"
            ]);
            assert.strictEqual(code2, expectedCode);

            const code3 = await provider.send("eth_getCode", [
              contractAddress
              // testing "latest" as default
            ]);
            assert.strictEqual(code3, expectedCode);
          });

          it("should return a `header not found` error for requests to non-existent blocks", async () => {
            const nextBlockNumber =
              Quantity.from(await provider.send("eth_blockNumber")).toBigInt() +
              1n;

            await assert.rejects(
              provider.send("eth_getCode", [
                contractAddress,
                Quantity.from(nextBlockNumber).toString()
              ]),
              {
                message: "header not found"
              },
              `eth_getCode should return an error when code at a non-existent block is requested (block #: ${nextBlockNumber})`
            );
          });
        }
      });
    });
  });
});
