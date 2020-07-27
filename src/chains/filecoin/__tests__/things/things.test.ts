import assert from "assert";
import { RootCID } from "../../src/things/rootcid";
import { CID } from "../../src/things/cid";
import { Tipset } from "../../src/things/tipset";
import { Block } from "../../src/things/block";

describe("things", () => {

  describe("general", () => {
    it("can create a new object from both a serialized object and a deserialized object", async() => {
      // We'll use RootCID here because it's a simple example 
      // with no recursive members during deserialization

      let rootCidFromSerializedData = new RootCID({
        "/": "badvu4qhg4y390tu5i4ongi9t2vdf429cl7kp7tcsnbas1f5d66zeb4q30mbsl"
      })

      // Note that the CID is defined as an object, which makes the type of data
      // passed into the constructor a deserialized object
      let rootCidFromDeserializedData = new RootCID({
        "/": new CID("badvu4qhg4y390tu5i4ongi9t2vdf429cl7kp7tcsnbas1f5d66zeb4q30mbsl")
      })

      assert.strictEqual(rootCidFromSerializedData["/"].value, rootCidFromDeserializedData["/"].value);

      // Now let's try a more complex one that has different keys and includes arrays
      let tipsetFromSerializedData = new Tipset({
        Cids: [
          {
            "/": "badvu4qhg4y390tu5i4ongi9t2vdf429cl7kp7tcsnbas1f5d66zeb4q30mbsl"
          }
        ],
        Blocks: [],
        Height: 0
      })

      let tipsetFromDeserializedData = new Tipset({
        cids: [
          new RootCID({
            "/": new CID("badvu4qhg4y390tu5i4ongi9t2vdf429cl7kp7tcsnbas1f5d66zeb4q30mbsl")
          })
        ],
        blocks: [],
        height: 0
      })

      assert.strictEqual(tipsetFromSerializedData.cids[0]["/"].value, tipsetFromDeserializedData.cids[0]["/"].value);
    })
  })


  describe("CID", () => {
    it("should create a random value by default", async() => {
      let cidOne = new CID();
      let cidTwo = new CID();

      // Let's just check the structure of the first one; if it's good, the second should be too
      assert.ok(cidOne.value);
      assert.equal(cidOne.value.length, 62);

      // Now let's make sure both of the values differ
      assert.notEqual(cidOne.value, cidTwo.value, "CID created should be random!");
    })

    it("should serialize to a string", async() => {
      let cid = new CID();

      assert(typeof cid.serialize() == "string");
    })
  })

  describe("RootCID", () => {
    it("creates the right structure by default", async() => {
      let rootCID = new RootCID();

      assert.ok(rootCID["/"], "No / parameter found!");
      assert.ok(rootCID["/"].value, "No CID value found");
      // TODO: Assert string value looks like a CID
    });

    it("should create a random CID by default", async() => {
      let rootCIDOne = new RootCID();
      let rootCIDTwo = new RootCID();

      assert.notEqual(rootCIDOne["/"].value, rootCIDTwo["/"].value)
    });
  });

  describe("Block", () => {
    it("has default values", async() => {
      let timestamp = new Date().getTime();

      let block = new Block();

      assert.strictEqual(block.miner.value, "t01000");
      assert.strictEqual(block.ticket.vrfProof, "tPnuOjWp9LS/w5VuB+ALc0wn+0aNRF9SkOSykAszkppjnSYGY1qFhhI2fI7PvS39FufkkH8AKCqctU23D4EkAKqZvnMEp8eVjy528BPWE394/n2Z4pJCgjHau2bK26vN");
      assert.strictEqual(block.electionProof.vrfProof, "kQHqldOpdnmexjOh8KwzR6kjSGHAD6tWWM9DpTgf1e/FuxZXwB6lSXg9rlVyMk1OFbRbOOqvbHL5ZER/HTD3a3d3DTlmJ6T8H+oAqVTkh64hdoX2QTyL9EHymMIpgTKX");
      assert.strictEqual(block.beaconEntries.length, 0);
      assert.strictEqual(block.winPoStProof.length, 0);
      assert.strictEqual(block.parents.length, 0);
      assert.strictEqual(block.parentWeight, 0);
      assert.strictEqual(block.height, 0);
      assert.strictEqual(block.parentStateRoot.length, 0);
      assert.strictEqual(block.parentMessageReceipts.length, 0);
      assert.strictEqual(block.messages.length, 0);
      assert.strictEqual(block.blsAggregate.data, "wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
      assert(block.timestamp >= timestamp);
      assert.strictEqual(block.blockSignature.data, "t1vv8DSsC2vAVmJsEjVyZgLcYS4+AG0qQzViaVWhfdW24YOt7qkRuDxSftbis/ZlDgCc1sGom26PvnLKLe4H0qJP7B4wW3yw8vp0zovZUV9zW1QkpKGJgO7HIhFlQcg9");
      assert.strictEqual(block.forkSignaling, 0);
    }) 
  })
});
