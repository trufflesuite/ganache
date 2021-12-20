import assert from "assert";
import { RootCID } from "../../src/things/root-cid";
import { CID } from "../../src/things/cid";
import { Tipset } from "../../src/things/tipset";
import { BlockHeader } from "../../src/things/block-header";
import IPFSCid from "cids";
import multihashing from "multihashing";
import { Address } from "../../src/things/address";

describe("things", () => {
  describe("general", () => {
    it("can create a new object from both a serialized object and a deserialized object", async () => {
      // We'll use RootCID here because it's a simple example
      // with no recursive members during deserialization

      const rootCidFromSerializedData = new RootCID({
        "/": "badvu4qhg4y390tu5i4ongi9t2vdf429cl7kp7tcsnbas1f5d66zeb4q30mbsl"
      });

      // Note that the CID is defined as an object, which makes the type of data
      // passed into the constructor a deserialized object
      const rootCidFromDeserializedData = new RootCID({
        root: new CID(
          "badvu4qhg4y390tu5i4ongi9t2vdf429cl7kp7tcsnbas1f5d66zeb4q30mbsl"
        )
      });

      assert.strictEqual(
        rootCidFromSerializedData.root.value,
        rootCidFromDeserializedData.root.value
      );

      // Now let's try a more complex one that has different keys and includes arrays
      const tipsetFromSerializedData = new Tipset({
        Cids: [
          {
            "/":
              "badvu4qhg4y390tu5i4ongi9t2vdf429cl7kp7tcsnbas1f5d66zeb4q30mbsl"
          }
        ],
        Blocks: [],
        Height: 0
      });

      const tipsetFromDeserializedData = new Tipset({
        cids: [
          new RootCID({
            root: new CID(
              "badvu4qhg4y390tu5i4ongi9t2vdf429cl7kp7tcsnbas1f5d66zeb4q30mbsl"
            )
          })
        ],
        blocks: [],
        height: 0
      });

      assert.strictEqual(
        tipsetFromSerializedData.cids[0].root.value,
        tipsetFromDeserializedData.cids[0].root.value
      );
    });
  });

  describe("CID", () => {
    it("should serialize to a string", async () => {
      const cidStr =
        "bafy2bzacebxe5fag7knys7s56eou6557lom3mmgvta27bc3jzn6ypaqw34s5y";
      const cid = new CID(cidStr);

      assert(typeof cid.serialize() == "string");
      assert.strictEqual(cid.serialize(), cidStr);
    });

    it("will error if no value is passed into the constructor", async () => {
      let error: Error | undefined;

      try {
        new CID();
      } catch (e: any) {
        error = e;
      }

      assert.notStrictEqual(
        typeof error,
        "undefined",
        "Expected CID constructor to throw an error on empty value!"
      );
      assert.strictEqual(error!.message, "A value is required for class CID");
    });
  });

  describe("Block", () => {
    it("has default values", async () => {
      const timestamp = new Date().getTime() / 1000;

      const block = new BlockHeader();

      assert.strictEqual(
        block.miner.value,
        Address.fromId(0, false, true).value
      );
      assert.strictEqual(block.beaconEntries.length, 0);
      assert.strictEqual(block.winPoStProof.length, 0);
      assert.strictEqual(block.parents.length, 0);
      assert.strictEqual(block.parentWeight, 0n);

      // The below verifies these CIDs point to 0
      let cid = new IPFSCid(block.parentStateRoot.root.value);
      assert(multihashing.verify(Buffer.from(cid.multihash), Buffer.from([0])));
      cid = new IPFSCid(block.parentMessageReceipts.root.value);
      assert(multihashing.verify(Buffer.from(cid.multihash), Buffer.from([0])));
      cid = new IPFSCid(block.messages.root.value);
      assert(multihashing.verify(Buffer.from(cid.multihash), Buffer.from([0])));

      assert.strictEqual(block.height, 0);
      assert(block.timestamp >= timestamp);
      assert.strictEqual(block.forkSignaling, 0);
    });
  });
});
