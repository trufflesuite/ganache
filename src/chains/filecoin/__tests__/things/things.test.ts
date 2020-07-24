import assert from "assert";
import { RootCID } from "../../src/things/rootcid";
import CID from "../../src/things/cid";

describe("things", () => {

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
