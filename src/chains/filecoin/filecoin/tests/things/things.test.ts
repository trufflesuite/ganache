import assert from "assert";
import { RootCID } from "../../src/things/root-cid";
import { CID } from "../../src/things/cid";
import { Tipset } from "../../src/things/tipset";
import { Block } from "../../src/things/block";
import { Address } from "../../src/things/address";

describe("things", () => {
  describe("general", () => {
    it("can create a new object from both a serialized object and a deserialized object", async () => {
      // We'll use RootCID here because it's a simple example
      // with no recursive members during deserialization

      let rootCidFromSerializedData = new RootCID({
        "/": "badvu4qhg4y390tu5i4ongi9t2vdf429cl7kp7tcsnbas1f5d66zeb4q30mbsl"
      });

      // Note that the CID is defined as an object, which makes the type of data
      // passed into the constructor a deserialized object
      let rootCidFromDeserializedData = new RootCID({
        "/": new CID(
          "badvu4qhg4y390tu5i4ongi9t2vdf429cl7kp7tcsnbas1f5d66zeb4q30mbsl"
        )
      });

      assert.strictEqual(
        rootCidFromSerializedData["/"].value,
        rootCidFromDeserializedData["/"].value
      );

      // Now let's try a more complex one that has different keys and includes arrays
      let tipsetFromSerializedData = new Tipset({
        Cids: [
          {
            "/":
              "badvu4qhg4y390tu5i4ongi9t2vdf429cl7kp7tcsnbas1f5d66zeb4q30mbsl"
          }
        ],
        Blocks: [],
        Height: 0
      });

      let tipsetFromDeserializedData = new Tipset({
        cids: [
          new RootCID({
            "/": new CID(
              "badvu4qhg4y390tu5i4ongi9t2vdf429cl7kp7tcsnbas1f5d66zeb4q30mbsl"
            )
          })
        ],
        blocks: [],
        height: 0
      });

      assert.strictEqual(
        tipsetFromSerializedData.cids[0]["/"].value,
        tipsetFromDeserializedData.cids[0]["/"].value
      );
    });
  });

  describe("CID", () => {
    it("should serialize to a string", async () => {
      let cidStr =
        "bafy2bzacebxe5fag7knys7s56eou6557lom3mmgvta27bc3jzn6ypaqw34s5y";
      let cid = new CID(cidStr);

      assert(typeof cid.serialize() == "string");
      assert.strictEqual(cid.serialize(), cidStr);
    });

    it("will error if no value is passed into the constructor", async () => {
      let error: Error;

      try {
        new CID();
      } catch (e) {
        error = e;
      }

      assert.notStrictEqual(
        typeof error,
        "undefined",
        "Expected CID constructor to throw an error on empty value!"
      );
      assert.strictEqual(error.message, "A value is required for class CID");
    });
  });

  describe("Block", () => {
    it("has default values", async () => {
      let timestamp = new Date().getTime();

      let block = new Block();

      assert.strictEqual(block.miner.value, "t01000");
      assert.strictEqual(
        block.ticket.vrfProof,
        "tPnuOjWp9LS/w5VuB+ALc0wn+0aNRF9SkOSykAszkppjnSYGY1qFhhI2fI7PvS39FufkkH8AKCqctU23D4EkAKqZvnMEp8eVjy528BPWE394/n2Z4pJCgjHau2bK26vN"
      );
      assert.strictEqual(
        block.electionProof.vrfProof,
        "kQHqldOpdnmexjOh8KwzR6kjSGHAD6tWWM9DpTgf1e/FuxZXwB6lSXg9rlVyMk1OFbRbOOqvbHL5ZER/HTD3a3d3DTlmJ6T8H+oAqVTkh64hdoX2QTyL9EHymMIpgTKX"
      );
      assert.strictEqual(block.beaconEntries.length, 0);
      assert.strictEqual(block.winPoStProof.length, 0);
      assert.strictEqual(block.parents.length, 0);
      assert.strictEqual(block.parentWeight, 0);
      assert.strictEqual(block.height, 0);
      assert.strictEqual(block.parentStateRoot.length, 0);
      assert.strictEqual(block.parentMessageReceipts.length, 0);
      assert.strictEqual(block.messages.length, 0);
      assert.strictEqual(
        block.blsAggregate.data,
        "wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
      );
      assert(block.timestamp >= timestamp);
      assert.strictEqual(
        block.blockSignature.data,
        "t1vv8DSsC2vAVmJsEjVyZgLcYS4+AG0qQzViaVWhfdW24YOt7qkRuDxSftbis/ZlDgCc1sGom26PvnLKLe4H0qJP7B4wW3yw8vp0zovZUV9zW1QkpKGJgO7HIhFlQcg9"
      );
      assert.strictEqual(block.forkSignaling, 0);
    });
  });

  describe("Address", () => {
    it("should derive a real address from a private key", async () => {
      // These were pulled directly from Lotus. This private key should
      // create the associated address.
      const privateKey =
        "f47e78b912695e50283ffb6bf032e489055add72fc5da206e3fc29bda8cafc52";
      const expectedAddress =
        "t3vc4eetfk32n3tv5z55p73a2vm32pwxnqgr3jmpf7ssnwff6yh34bjc4vvarzivian5advbmvpmgw7ijxrboa";

      let address = new Address(privateKey);

      assert.strictEqual(address.value, expectedAddress);
    });

    it("should create a random address when calling Address.random()", async () => {
      let address = Address.random();

      assert(Address.isValid(address.value));
    });
  });
});
