import assert from "assert";
import { EthereumProvider } from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
const DEFAULT_DIFFICULTY = 1;
let provider: EthereumProvider;
import { Quantity } from "@ganache/utils";

async function sendEIP1559Transaction(params) {
  const { provider, from, to } = params;
  const tx = {
    from,
    to,
    value: "0x123",
    type: "0x2",
    maxPriorityFeePerGas: "0xf",
    maxFeePerGas: "0xffffffff"
  } as any;
  await provider.send("eth_sendTransaction", [tx]);
}
async function sendLegacyTransaction(params) {
  const { provider, from, to } = params;
  const tx = {
    from,
    to,
    value: "0x123",
    maxFeePerGas: "0xffffffff"
  } as any;
  await provider.send("eth_sendTransaction", [tx]);
}
async function mineNBlocks(params) {
  const { provider, blocks } = params;
  await provider.send("evm_mine", [
    {
      blocks
    }
  ]);
}

describe("api", () => {
  describe("eth", () => {
    describe("feeHistory", () => {
      const genesisBlock = "0x0";
      const headerNotFoundBlock = "0x999999";
      const ERROR_HEADER_NOT_FOUND = "header not found";

      beforeEach(async () => {
        provider = await getProvider();
        const blocks = 10;
        await mineNBlocks({ provider, blocks });
      });
      afterEach(async () => {
        provider && (await provider.disconnect());
      });

      describe("params", () => {
        describe("blockCount", () => {
          it("retrieves a range of valid blocks", async () => {
            const blockCount = "0x3";
            const newestBlock = "0xa";
            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.equal(feeHistory.oldestBlock, "0x8");
            assert.equal(feeHistory.baseFeePerGas.length, 4); // blockCount + 1
            assert.equal(feeHistory.gasUsedRatio.length, 3);
          });
          it("matches infura response for blockCount === 0", async () => {
            const blockCount = "0x0";
            const newestBlock = "0xa";
            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.equal(feeHistory.oldestBlock, "0x0");
            assert.equal(feeHistory.baseFeePerGas, undefined);
            assert.equal(feeHistory.gasUsedRatio, null);
            assert.equal(feeHistory.reward, undefined);
          });
          it("matches infura response for blockCount === 0 && newestBlock = 0x0", async () => {
            const blockCount = "0x0";
            const newestBlock = "0x0";
            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.equal(feeHistory.oldestBlock, "0x0");
            assert.equal(feeHistory.baseFeePerGas, undefined);
            assert.equal(feeHistory.gasUsedRatio, null);
            assert.equal(feeHistory.reward, undefined);
          });
          describe("newestBlock", () => {
            it("throws if header is not found", async () => {
              const blockCount = "0x1";
              await provider
                .send("eth_feeHistory", [blockCount, headerNotFoundBlock, []])
                .catch(e => {
                  assert.strictEqual(e.message, ERROR_HEADER_NOT_FOUND);
                });
            });
          });
          describe("rewardPercentile", () => {
            it("undefined if no percentiles given", async () => {
              const blockCount = "0x1";
              const newestBlock = "0x2";
              const feeHistory = await provider.send("eth_feeHistory", [
                blockCount,
                newestBlock,
                []
              ]);

              assert.equal(feeHistory.reward, undefined);
            });
          });
        });
      });
      describe("response", () => {
        describe("oldestBlock", () => {
          it("ignores blocks that do not exist (blockCount > newestBlock)", async () => {
            const blockCount = "0xa";
            const newestBlock = "0x2";
            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.equal(feeHistory.oldestBlock, genesisBlock);
            assert.equal(feeHistory.baseFeePerGas.length, 4); // blocks found + 1
            assert.equal(feeHistory.gasUsedRatio.length, 3);
          });
          it("newestBlock = oldestBlock when blockCount === 1", async () => {
            const blockCount = "0x1";
            const newestBlock = "0x2";
            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.equal(feeHistory.oldestBlock, newestBlock);
          });
          it("oldestBlock = newestBlock - blockCount +1", async () => {
            const blockCount = "0x1";
            const newestBlock = "0x2";
            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.equal(feeHistory.oldestBlock, newestBlock);
          });
        });
      });
      //describe("baseFeePerGas");
      //describe("reward");
    });
  });
});
