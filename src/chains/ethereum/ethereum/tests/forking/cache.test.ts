import * as fc from "fast-check";

import * as Arbitrary from "./cache/arbitraries";

import { PersistentCache } from "../../src/forking/persistent-cache/persistent-cache";

import { Data, Quantity } from "@ganache/utils";
import { Tree } from "../../src/forking/persistent-cache/tree";
import assert from "assert";

const testConfig = process.env["OVERKILL"]
  ? {
      timeout: 5 * 60 * 1000, // 5 min
      numRuns: 500
    }
  : {
      timeout: 30 * 1000, // 30 sec
      numRuns: 50
    };

describe("forking", () => {
  describe("persistent cache", () => {
    it("works", async () => {
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
          await PersistentCache.deleteDb(dbName);
          try {
            type Ref = {
              hash: string;
              block: {
                number: number;
                hash: string;
              };
              parent: string;
              children: Set<Ref>;
            };
            const networkLookup: Map<string, Ref> = new Map();
            const worldState = new Set<Ref>();
            for (const batch of batches) {
              const block = batch.input.historicBlock;
              const network = model.networks[batch.descendantIndex];

              // if we aren't the genesis block get the genesis block and add it
              // to our world state, if needed.

              let genesisRef: Ref;
              const genesis = network.getBlockByNumber(0);
              if (!networkLookup.has(genesis.hash)) {
                genesisRef = {
                  hash: genesis.hash,
                  block: genesis,
                  parent: null,
                  children: new Set()
                };
                networkLookup.set(genesis.hash, genesisRef);
                worldState.add(genesisRef);
              } else {
                genesisRef = networkLookup.get(genesis.hash);
              }

              // if we don't yet know about this block, add it
              let ref: Ref;
              if (!networkLookup.has(block.hash)) {
                ref = {
                  hash: block.hash,
                  block: block,
                  parent: null,
                  children: new Set()
                };
                networkLookup.set(block.hash, ref);
              } else {
                ref = networkLookup.get(block.hash);
              }

              if (block.number > 0) {
                function findLatestAncestorAndUpdateDescendants(
                  curRef: Ref
                ): Ref {
                  for (const child of curRef.children.values()) {
                    // if the child is us don't do anything.
                    if (child.hash == block.hash) continue;

                    const networkBlock = network.getBlockByNumber(
                      child.block.number
                    );
                    const isInNetwork =
                      networkBlock && networkBlock.hash === child.block.hash;
                    if (!isInNetwork) {
                      continue;
                    }
                    // if the child is after us it is our descendent
                    if (child.block.number > block.number) {
                      curRef.children.delete(child);
                      ref.children.add(child);
                      child.parent = ref.block.hash;
                    } else {
                      // otherwise, it might be our ancestor, keep checking!
                      return findLatestAncestorAndUpdateDescendants(child);
                    }
                  }
                  return curRef;
                }
                let latestAncestor = findLatestAncestorAndUpdateDescendants(
                  genesisRef
                );
                latestAncestor.children.add(ref);
                ref.parent = latestAncestor.block.hash;
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
              await cache.close();

              const serialized = await PersistentCache.serializeDb(dbName);
              const cacheState: Set<Ref> = new Set();
              function convertToRefs(
                parentHash: string,
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
                    parent: parentHash,
                    children: new Set()
                  };
                  parent.add(ref);
                  if (value.descendants) {
                    convertToRefs(
                      hash.toString(),
                      value.descendants,
                      ref.children
                    );
                  }
                });
              }
              convertToRefs(null, serialized, cacheState);

              assert.deepStrictEqual(worldState, cacheState);
            }
          } finally {
            await PersistentCache.deleteDb(dbName);
          }
        }),
        {
          numRuns: testConfig.numRuns
        }
      );
    });
  });
});
