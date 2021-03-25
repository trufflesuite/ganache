import assert from "assert";
import Blockchain from "../../src/blockchain";
import { Tipset } from "../../src/things/tipset";
import IpfsHttpClient from "ipfs-http-client";
import { StartDealParams } from "../../src/things/start-deal-params";
import { StorageMarketDataRef } from "../../src/things/storage-market-data-ref";
import { RootCID } from "../../src/things/root-cid";
import { StorageDealStatus } from "../../src/types/storage-deal-status";

import { FilecoinOptionsConfig } from "@ganache/filecoin-options";

describe("Blockchain", () => {
  describe("general", () => {
    let blockchain: Blockchain;

    before(async () => {
      blockchain = new Blockchain(
        FilecoinOptionsConfig.normalize({
          logging: {
            logger: {
              log: () => {}
            }
          }
        })
      );
      await blockchain.waitForReady();
    });

    after(async () => {
      await blockchain.stop();
    });

    it("creates new tipset with one block on creation", async () => {
      let genesis: Tipset = blockchain.genesisTipset();

      assert.strictEqual(genesis.height, 0);
      assert.strictEqual(genesis.blocks.length, 1);
    });

    it("mines a new tipset and creates parent/child relationship between blocks", async () => {
      blockchain.mineTipset();

      let genesis: Tipset = blockchain.genesisTipset();
      let latest: Tipset = blockchain.latestTipset();

      assert.strictEqual(latest.height, 1, "Incorrect height!");
      assert(
        latest.blocks[0].parents[0].equals(genesis.cids[0]),
        "block in latest tipset should have genesis tipset as parent"
      );
    });
  });

  describe("interval mining", () => {
    it("will mine blocks on an interval", async function () {
      this.timeout(10000);

      let blockchain = new Blockchain(
        FilecoinOptionsConfig.normalize({
          miner: {
            blockTime: 0.1
          },
          logging: {
            logger: {
              log: () => {}
            }
          }
        })
      );

      try {
        await blockchain.waitForReady();

        // After 0.5 seconds, we should have at least 3 blocks and no more than 10 blocks
        // Github CI is so unpredictable with their burstable cpus
        await new Promise(resolve => setTimeout(resolve, 500));

        let latest: Tipset = blockchain.latestTipset();

        assert(
          latest.height >= 3 || latest.height <= 10,
          `Expected between 3 and 10 blocks to be mined, but got ${latest.height}`
        );
      } finally {
        blockchain.stop();
      }
    });
  });

  describe("ipfs server", () => {
    it("creates an ipfs server", async () => {
      let blockchain = new Blockchain(
        FilecoinOptionsConfig.normalize({
          logging: {
            logger: {
              log: () => {}
            }
          }
        })
      );

      try {
        await blockchain.waitForReady();

        let ipfs = IpfsHttpClient({
          host: "localhost",
          port: blockchain.options.chain.ipfsPort,
          protocol: "http",
          apiPath: "/api/v0"
        });

        const testData = "this is some data!";

        let result = await ipfs.add(testData);
        let cid = result.path;

        // This is the exact CID expected from the test data.
        assert.strictEqual(
          cid,
          "QmRjSaq4CDRg4Rbj3wXXeuVVfVE1H3UeQzMt2WKjArh6V9"
        );
      } finally {
        await blockchain.stop();
      }
    });
  });

  describe("deal state progression", () => {
    let blockchain: Blockchain;

    afterEach(async () => {
      await blockchain.stop();
    });

    it("advances state of in process deals on every block", async () => {
      blockchain = new Blockchain(
        FilecoinOptionsConfig.normalize({
          miner: {
            blockTime: -1
          },
          logging: {
            logger: {
              log: () => {}
            }
          }
        })
      );

      await blockchain.waitForReady();

      let result = await blockchain.ipfs!.add("some data");

      let proposal = new StartDealParams({
        data: new StorageMarketDataRef({
          transferType: "graphsync",
          root: new RootCID({
            "/": result.path
          }),
          pieceSize: 0
        }),
        wallet: blockchain.address,
        miner: blockchain.miner,
        epochPrice: 2500n,
        minBlocksDuration: 300
      });

      let { root: proposalCid } = await blockchain.startDeal(proposal);

      // First state should be validating
      assert.strictEqual(
        blockchain.dealsByCid[proposalCid.value].state,
        StorageDealStatus.Validating
      );

      await blockchain.mineTipset();

      // Next state should be Staged
      assert.strictEqual(
        blockchain.dealsByCid[proposalCid.value].state,
        StorageDealStatus.Staged
      );

      await blockchain.mineTipset();

      // Next state should be ReserveProviderFunds
      assert.strictEqual(
        blockchain.dealsByCid[proposalCid.value].state,
        StorageDealStatus.ReserveProviderFunds
      );

      // ... and on and on

      // Let's mine all the way to the Sealing state
      while (
        blockchain.dealsByCid[proposalCid.value].state !=
        StorageDealStatus.Sealing
      ) {
        await blockchain.mineTipset();
      }

      // The deal should still be considered in process, since it's still sealing
      assert.strictEqual(blockchain.inProcessDeals.length, 1);
      assert.strictEqual(
        blockchain.inProcessDeals[0].proposalCid.root.value,
        proposalCid.value
      );

      // Now let's mine the final tipset, making it active, and check to see that
      // the deal was pulled out of the in process array.
      await blockchain.mineTipset();

      assert.strictEqual(
        blockchain.dealsByCid[proposalCid.value].state,
        StorageDealStatus.Active
      );
      assert.strictEqual(blockchain.inProcessDeals.length, 0);
    });

    it("fully advances the state of in process deals when automining", async () => {
      blockchain = new Blockchain(
        FilecoinOptionsConfig.normalize({
          miner: {
            blockTime: 0
          },
          logging: {
            logger: {
              log: () => {}
            }
          }
        })
      );

      await blockchain.waitForReady();

      let result = await blockchain.ipfs!.add("some data");

      let proposal = new StartDealParams({
        data: new StorageMarketDataRef({
          transferType: "graphsync",
          root: new RootCID({
            "/": result.path
          }),
          pieceSize: 0
        }),
        wallet: blockchain.address,
        miner: blockchain.miner,
        epochPrice: 2500n,
        minBlocksDuration: 300
      });

      let { root: proposalCid } = await blockchain.startDeal(proposal);

      // Since we're automining, starting the deal will trigger
      // the state to be state to be set to active.
      assert.strictEqual(
        blockchain.dealsByCid[proposalCid.value].state,
        StorageDealStatus.Active
      );

      // We create 1 tipset per state change. Let's make sure that occurred.
      assert.strictEqual(blockchain.tipsets.length, 12);
    });
  });

  describe("determinism", () => {
    let blockchain: Blockchain;

    const expectedAddress =
      "t3qdqduswwvsvq72iwppn2vytvq2mt7qi5nensswvawpdkmudnzxooi45edyflgnohrfvijy77pn66247nttzq";

    afterEach(async () => {
      if (blockchain) {
        await blockchain.stop();
      }
    });

    it("creates the expected address from seed", async () => {
      blockchain = new Blockchain(
        FilecoinOptionsConfig.normalize({
          wallet: {
            seed: "tim is a swell guy"
          },
          logging: {
            logger: {
              log: () => {}
            }
          }
        })
      );
      await blockchain.waitForReady();

      assert.strictEqual(blockchain.address.value, expectedAddress);
    });

    it("uses the seed to create a different level of determinism", async () => {
      blockchain = new Blockchain(
        FilecoinOptionsConfig.normalize({
          wallet: {
            seed: "tim is a swell person"
          },
          logging: {
            logger: {
              log: () => {}
            }
          }
        })
      );
      await blockchain.waitForReady();

      assert.notStrictEqual(blockchain.address.value, expectedAddress);
    });
  });
});
