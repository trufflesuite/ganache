import assert from "assert";
import Blockchain from "../../src/blockchain";
import { Tipset } from "../../src/things/tipset";
import IpfsHttpClient from "ipfs-http-client";

describe("Blockchain", () => {
  
  describe("general", () => {
    let blockchain:Blockchain;

    before(async() => {
      blockchain = new Blockchain();
      await blockchain.waitForReady();
    })
  
    after(async() => {
      await blockchain.stop();
    })
  
    it("creates new tipset with one block on creation", async() => {
      let genesis:Tipset = blockchain.genesisTipset();
  
      assert.strictEqual(genesis.height, 0);
      assert.strictEqual(genesis.blocks.length, 1);
    })
  
    it("mines a new tipset and creates parent/child relationship between blocks", async() => {
      blockchain.mineTipset();
  
      let genesis:Tipset = blockchain.genesisTipset();
      let latest:Tipset = blockchain.latestTipset();
  
      assert.strictEqual(latest.height, 1, "Incorrect height!");
      assert(latest.blocks[0].parents[0].equals(genesis.cids[0]), "block in latest tipset should have genesis tipset as parent");
    })
  })
  
  describe("interval mining", () => {
    it("will mine blocks on an interval", async function() {
      this.timeout(10000);
  
      let blockchain = new Blockchain({
        blockTime: 100
      });
  
      await blockchain.waitForReady();
  
      // After 0.5 seconds, we should have at least 4 blocks
      // I'm not checking for exactly 5 to dodge race conditions
      await new Promise(resolve => setTimeout(resolve, 500));
    
      let latest:Tipset = blockchain.latestTipset();
  
      assert(latest.height >= 4)

      await blockchain.stop();
    })
  })

  describe("ipfs server", () => {
    it("creates an ipfs server", async() => {
      let blockchain = new Blockchain();

      await blockchain.waitForReady();

      let ipfs = IpfsHttpClient({
        host: "localhost",
        port: blockchain.ipfsPort,
        protocol: "http",
        apiPath: "/api/v0" 
      });

      const testData = "this is some data!";

      let result = await ipfs.add(testData);
      let cid = result.path;
      
      // This is the exact CID expected from the test data.
      assert.strictEqual(cid, "QmRjSaq4CDRg4Rbj3wXXeuVVfVE1H3UeQzMt2WKjArh6V9");

      await blockchain.stop();
    });
  })

});
