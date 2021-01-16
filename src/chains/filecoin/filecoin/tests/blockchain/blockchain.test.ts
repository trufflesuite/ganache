import assert from "assert";
import Blockchain from "../../src/blockchain";
import { Tipset } from "../../src/things/tipset";
import IpfsHttpClient from "ipfs-http-client";
import { StorageProposal } from "../../src/things/storage-proposal";
import { StorageProposalData } from "../../src/things/storage-proposal-data";
import { RootCID } from "../../src/things/root-cid";
import { DealState } from "../../src/deal-state";

import { FilecoinOptionsConfig } from "@ganache/filecoin-options";

describe("Blockchain", () => {
  describe("general", () => {
    let blockchain: Blockchain;

    before(async () => {
      blockchain = new Blockchain(FilecoinOptionsConfig.normalize({}));
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
            blockTime: 100
          }
        })
      );

      try {
        await blockchain.waitForReady();

        // After 1 second, we should have well over 4 blocks
        // I'm not checking for exactly 5 to dodge race conditions
        await new Promise(resolve => setTimeout(resolve, 1000));

        let latest: Tipset = blockchain.latestTipset();

        assert(latest.height >= 4);
      } finally {
        blockchain.stop();
      }
    });
  });

  describe("ipfs server", () => {
    it("creates an ipfs server", async () => {
      let blockchain = new Blockchain(FilecoinOptionsConfig.normalize({}));

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
          miner: { automining: false }
        })
      );

      await blockchain.waitForReady();

      let result = await blockchain.ipfs.add("some data");

      let proposal = new StorageProposal({
        data: new StorageProposalData({
          transferType: "graphsync",
          root: new RootCID({
            "/": result.path
          }),
          pieceCid: null,
          pieceSize: 0
        }),
        wallet: blockchain.address,
        miner: blockchain.miner,
        epochPrice: "2500",
        minBlocksDuration: 300
      });

      let { "/": proposalCid } = await blockchain.startDeal(proposal);

      // First state should be validating
      assert.strictEqual(
        blockchain.dealsByCid[proposalCid.value].state,
        DealState.Validating
      );

      await blockchain.mineTipset();

      // Next state should be Staged
      assert.strictEqual(
        blockchain.dealsByCid[proposalCid.value].state,
        DealState.Staged
      );

      await blockchain.mineTipset();

      // Next state should be EnsureProviderFunds
      assert.strictEqual(
        blockchain.dealsByCid[proposalCid.value].state,
        DealState.EnsureProviderFunds
      );

      // ... and on and on

      // Let's mine all the way to the Sealing state
      while (
        blockchain.dealsByCid[proposalCid.value].state != DealState.Sealing
      ) {
        await blockchain.mineTipset();
      }

      // The deal should still be considered in process, since it's still sealing
      assert.strictEqual(blockchain.inProcessDeals.length, 1);
      assert.strictEqual(
        blockchain.inProcessDeals[0].proposalCid["/"].value,
        proposalCid.value
      );

      // Now let's mine the final tipset, making it active, and check to see that
      // the deal was pulled out of the in process array.
      await blockchain.mineTipset();

      assert.strictEqual(
        blockchain.dealsByCid[proposalCid.value].state,
        DealState.Active
      );
      assert.strictEqual(blockchain.inProcessDeals.length, 0);
    });

    it("fully advances the state of in process deals when automining", async () => {
      blockchain = new Blockchain(
        FilecoinOptionsConfig.normalize({
          miner: {
            automining: true
          }
        })
      );

      await blockchain.waitForReady();

      let result = await blockchain.ipfs.add("some data");

      let proposal = new StorageProposal({
        data: new StorageProposalData({
          transferType: "graphsync",
          root: new RootCID({
            "/": result.path
          }),
          pieceCid: null,
          pieceSize: 0
        }),
        wallet: blockchain.address,
        miner: blockchain.miner,
        epochPrice: "2500",
        minBlocksDuration: 300
      });

      let { "/": proposalCid } = await blockchain.startDeal(proposal);

      // Since we're automining, starting the deal will trigger
      // the state to be state to be set to active.
      assert.strictEqual(
        blockchain.dealsByCid[proposalCid.value].state,
        DealState.Active
      );

      // We create 1 tipset per state change. Let's make sure that occurred.
      assert.strictEqual(blockchain.tipsets.length, 12);
    });
  });

  describe("determinism", () => {
    let blockchain: Blockchain;

    before(async () => {
      blockchain = new Blockchain(
        FilecoinOptionsConfig.normalize({
          wallet: {
            seed: "tim is a swell guy"
          }
        })
      );
      await blockchain.waitForReady();
    });

    after(async () => {
      await blockchain.stop();
    });

    it("creates the expected address from seed", async () => {
      let expectedAddress =
        "t3teloaxbdlmh3q3pbnwofxmpg4oszq6p6ohbj2b5ya6evk3gqi4qfdksjq2vanvsppp634uadfuka7igxymca";

      assert.strictEqual(blockchain.address.value, expectedAddress);
    });
  });
});
