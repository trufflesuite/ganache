import assert from "assert";
import { RootCID } from "../../src/things/rootcid";
import CID from "../../src/things/cid";
import { time } from "console";
import { Tipset } from "../../src/things/tipset";

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
});
