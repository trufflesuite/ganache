import assert from "assert";
import { FilecoinOptionsConfig } from "@ganache/filecoin-options";
import { readdir } from "fs-extra";
import tmp from "tmp-promise";
import Blockchain from "../../src/blockchain";

describe("Blockchain", () => {
  describe("database", () => {
    let dbPath: string;
    let blockchain: Blockchain;

    before(async () => {
      tmp.setGracefulCleanup();
      dbPath = (await tmp.dir()).path;
    });

    afterEach(async () => {
      if (blockchain) {
        await blockchain.stop();
      }
    });

    it("saves information to database", async () => {
      blockchain = new Blockchain(
        FilecoinOptionsConfig.normalize({
          database: {
            dbPath
          },
          logging: {
            logger: {
              log: () => {}
            }
          }
        })
      );

      await blockchain.waitForReady();
      await blockchain.mineTipset();
      const dir = await readdir(dbPath);
      assert(dir.length > 0);
    });

    it("resumes blockchain from prior state", async () => {
      blockchain = new Blockchain(
        FilecoinOptionsConfig.normalize({
          database: {
            dbPath
          },
          logging: {
            logger: {
              log: () => {}
            }
          }
        })
      );

      await blockchain.waitForReady();
      const latestTipset = blockchain.latestTipset();
      assert.strictEqual(latestTipset.height, 1);
      assert(
        latestTipset.blocks.length > 0,
        "Did not load blocks along with tipset"
      );
    });
  });
});
