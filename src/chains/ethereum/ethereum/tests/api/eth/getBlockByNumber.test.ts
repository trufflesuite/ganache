import assert from "assert";
import EthereumProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import compile from "../../helpers/compile";
import { join } from "path";
import { Quantity } from "@ganache/utils";

describe("api", () => {
  describe("eth", () => {
    describe("getBlockByNumber", () => {
      let provider: EthereumProvider;

      before(async () => {
        provider = await getProvider();
      });

      after(async () => {
        provider && (await provider.disconnect());
      });

      describe("difficulty", () => {
        it("returns 1 for difficulty by default", async () => {
          const block = await provider.send("eth_getBlockByNumber", ["latest"]);
          assert.strictEqual(block.difficulty, "0x1");
        });
      });

      describe("totalDifficulty", () => {
        it("returns 1 for genesis block totalDifficulty", async () => {
          const block = await provider.send("eth_getBlockByNumber", ["0x0"]);
          assert.strictEqual(block.totalDifficulty, "0x1");
        });
      });
    });
  });
});
