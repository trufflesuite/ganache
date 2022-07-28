import assert from "assert";
import { FilecoinOptionsConfig } from "@ganache/filecoin-options";
import { readdir } from "fs-extra";
import tmp from "tmp-promise";
import Blockchain from "../../src/blockchain";

describe("Blockchain", () => {
  describe("database", () => {
    let dbPath: string;
    let blockchain: Blockchain;
    let ipfsCid: string;

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

      await blockchain.initialize();
      await blockchain.mineTipset();
      const dir = await readdir(dbPath);
      assert(dir.length > 0);

      const result = await blockchain.ipfs.add({
        content: "I am data"
      });
      ipfsCid = result.cid.toString();

      // ensure it exists
      let gotFile = false;
      for await (const file of blockchain.ipfs.get(ipfsCid)) {
        if (file.type === "file" && file.content && !gotFile) {
          let string = "";
          for await (const chunk of file.content) {
            string += chunk.toString();
          }
          assert.strictEqual(string, "I am data");
          gotFile = true;
          break;
        }
      }

      if (!gotFile) {
        assert.fail("Could not save data to IPFS");
      }
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

      await blockchain.initialize();
      const latestTipset = blockchain.latestTipset();
      assert.strictEqual(latestTipset.height, 1);
      assert(
        latestTipset.blocks.length > 0,
        "Did not load blocks along with tipset"
      );
    });

    it("restores IPFS data from prior blockchain state", async () => {
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

      await blockchain.initialize();

      let gotFile = false;
      for await (const file of blockchain.ipfs.get(ipfsCid)) {
        if (file.type === "file" && file.content && !gotFile) {
          let string = "";
          for await (const chunk of file.content) {
            string += chunk.toString();
          }
          assert.strictEqual(string, "I am data");
          gotFile = true;
          break;
        }
      }

      if (!gotFile) {
        assert.fail("Did not successfully restore IPFS data");
      }
    });
  });
});
