import assert from "assert";
import { EthereumProvider } from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
const DEFAULT_DIFFICULTY = 1;
let provider: EthereumProvider;

describe("api", () => {
  describe("eth", () => {
    describe("feeHistory", () => {
      const genesisBlock = "0x0";
      const startingBlock = "0x5";
      const headerNotFoundBlock = "0x999999";
      const blockCount = "0x3";
      const oldestBlock = "0x3";
      const baseFeePerGasLength = Number(blockCount) + 1;
      const gasUsedRatioLength = Number(blockCount);
      const ERROR_HEADER_NOT_FOUND = "header not found";

      beforeEach(async () => {
        provider = await getProvider();

        await provider.send("evm_mine", [
          {
            blocks: 10
          }
        ]);
      });
      afterEach(async () => {
        provider && (await provider.disconnect());
      });

      it("feeHistory response", async () => {
        const feeHistory = await provider.send("eth_feeHistory", [
          blockCount,
          startingBlock
        ]);

        assert.equal(feeHistory.oldestBlock, oldestBlock);
        assert.equal(feeHistory.baseFeePerGas.length, baseFeePerGasLength);
        assert.equal(feeHistory.gasUsedRatio.length, gasUsedRatioLength);
      });
      it("ignores blocks before genesis", async () => {
        const feeHistory = await provider.send("eth_feeHistory", [
          blockCount,
          genesisBlock
        ]);

        assert.equal(feeHistory.oldestBlock, genesisBlock);
      });
      it("throws if newestBlock blockheader is not found", async () => {
        await provider
          .send("eth_feeHistory", [blockCount, headerNotFoundBlock])
          .catch(e => {
            assert.strictEqual(e.message, ERROR_HEADER_NOT_FOUND);
          });
      });
    });
  });
});
