import assert from "assert";
import Blockchain from "../../src/blockchain";
import { Tipset } from "../../src/things/tipset";

describe("Blockchain", () => {
  let blockchain:Blockchain;

  beforeEach(async() => {
    blockchain = new Blockchain();
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

});
