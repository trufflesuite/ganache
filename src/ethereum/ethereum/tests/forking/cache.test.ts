import * as fc from "fast-check";

import * as Arbitrary from "./cache/arbitraries";

import { PersistentCache } from "../../src/forking/persistent-cache/persistent-cache";

import { Data, Quantity } from "@ganache/utils";
import { Tree } from "../../src/forking/persistent-cache/tree";
import assert from "assert";
import { BatchManager, Ref } from "./cache/batch-manager";

describe("forking", () => {
  describe("persistent cache", () => {
    it("creates relationships between networks correctly", async () => {
      const arb = Arbitrary.Networks().chain(model =>
        fc.record({
          model: fc.constant(model),
          batches: Arbitrary.Batches(model)
        })
      );

      let counter = 0;
      await fc.assert(
        fc.asyncProperty(arb, async ({ model, batches }) => {
          counter++;
          const dbName = `-test-db-${counter}`;
          // make sure this cache doesn't already exist
          await PersistentCache.deleteDb(dbName);
          try {
            const batchManager = new BatchManager(model);
            for (const batch of batches) {
              const block = batch.input.historicBlock;
              const network = model.networks[batch.descendantIndex];

              const genesisRef = batchManager.getGenesis(network);
              const ref = batchManager.getOwnRef(block);

              if (block.number > 0) {
                const latestAncestor = batchManager.findLatestAncestor(
                  batch,
                  genesisRef
                );
                latestAncestor.children.add(ref);
                batchManager.fixDescendants(
                  ref,
                  network,
                  genesisRef,
                  batchManager.collectDescendants(ref)
                );
              }

              const cache = await PersistentCache.create(dbName);
              await cache.initialize(
                Quantity.from(block.number),
                Data.from(block.hash),
                ((_method: string, params: any[]) => {
                  return Promise.resolve(
                    network.getBlockByNumber(
                      params[0] === "earliest"
                        ? "earliest"
                        : (parseInt(params[0], 16) as any)
                    )
                  );
                }) as any
              );

              // wait for the descendant re-balance to complete before closing
              cache._reBalancePromise && (await cache._reBalancePromise);
              await cache.close();

              const serialized = await PersistentCache.serializeDb(dbName);

              const cacheState: Set<Ref> = new Set();
              function convertToRefs(
                descendants: typeof serialized,
                parent: Ref["children"]
              ) {
                Object.entries(descendants).map(([key, value]) => {
                  const { height, hash } = Tree.decodeKey(
                    Buffer.from(key, "hex")
                  );
                  const ref: Ref = {
                    hash: hash.toString(),
                    block: {
                      number: height.toNumber(),
                      hash: hash.toString()
                    },
                    children: new Set()
                  };
                  parent.add(ref);
                  if (value.descendants) {
                    convertToRefs(value.descendants, ref.children);
                  }
                });
              }
              convertToRefs(serialized, cacheState);

              assert.deepStrictEqual(batchManager.worldState, cacheState);
            }
          } finally {
            await PersistentCache.deleteDb(dbName);
          }
        }),
        {
          numRuns: 50,
          endOnFailure: true
        }
      );
    }).timeout(120000);
  });
});
