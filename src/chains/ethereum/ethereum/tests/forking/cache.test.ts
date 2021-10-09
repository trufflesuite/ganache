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
    it("create relationships between networks correctly", async () => {
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
              children: Set<Ref>;
            };
            const networkLookup: Map<string, Ref> = new Map();
            const worldState = new Set<Ref>();
            for (const batch of batches) {
              const block = batch.input.historicBlock;
              const network = model.networks[batch.descendantIndex];
              function getGenesis() {
                // Get the genesis block and add it to our world state, if needed.
                const genesis = network.getBlockByNumber(0);
                if (!networkLookup.has(genesis.hash)) {
                  const genesisRef: Ref = {
                    hash: genesis.hash,
                    block: genesis,
                    children: new Set()
                  };
                  networkLookup.set(genesis.hash, genesisRef);
                  worldState.add(genesisRef);
                  return genesisRef;
                } else {
                  return networkLookup.get(genesis.hash);
                }
              }
              function getOwnRef() {
                if (!networkLookup.has(block.hash)) {
                  const ref: Ref = {
                    hash: block.hash,
                    block: block,
                    children: new Set()
                  };
                  // if we don't yet know about this block, add it
                  networkLookup.set(block.hash, ref);
                  return ref;
                } else {
                  return networkLookup.get(block.hash);
                }
              }

              const genesisRef = getGenesis();
              const ref = getOwnRef();

              if (block.number > 0) {
                function findLatestAncestorAndUpdateDescendants(
                  curRef: Ref
                ): Ref[] {
                  const candidates: Ref[] = [curRef];
                  for (const child of curRef.children.values()) {
                    if (child.hash === block.hash) {
                      // if the child is the same block as us we must delete it
                      // because we are figuring this all out again anyway
                      curRef.children.delete(child);
                      continue;
                    }

                    const networkBlock = network.getBlockByNumber(
                      child.block.number
                    );
                    const isInNetwork =
                      networkBlock && networkBlock.hash === child.hash;
                    if (!isInNetwork) continue;

                    // if the child is in network and comes after us it is
                    // an eventual descendant. continue searching!
                    if (child.block.number >= block.number) continue;

                    // otherwise, it might be our ancestor, keep checking more!
                    candidates.push(
                      ...findLatestAncestorAndUpdateDescendants(child)
                    );
                  }
                  return candidates;
                }
                const candidates = findLatestAncestorAndUpdateDescendants(
                  genesisRef
                );
                const [latestAncestor] = candidates.sort((a, b) => {
                  if (a.block.number < b.block.number) {
                    return 1;
                  } else if (a.block.number === b.block.number) {
                    return 0;
                  } else {
                    return -1;
                  }
                });

                // traverse up all descendants to fix those relationships
                const fixDescendants = (parent: Ref) => {
                  const children = [...parent.children.values()];
                  for (const child of children) {
                    const networkBlock = network.getBlockByNumber(
                      child.block.number
                    );
                    const isInNetwork =
                      networkBlock && networkBlock.hash === child.hash;
                    if (!isInNetwork) continue;

                    if (child.block.number > block.number) {
                      parent.children.delete(child);
                      ref.children.add(child);
                    } else {
                      fixDescendants(child);
                    }
                  }
                };
                fixDescendants(genesisRef);

                latestAncestor.children.add(ref);
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

              cache._reBalancePromise && (await cache._reBalancePromise);
              await cache.close();

              const serialized = await PersistentCache.serializeDb(dbName);
              console.log(JSON.stringify(serialized, null, 2));
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

              try {
                assert.deepStrictEqual(worldState, cacheState);
              } catch (e) {
                console.log(e);
                throw e;
              }
            }
          } finally {
            await PersistentCache.deleteDb(dbName);
          }
        }),
        {
          numRuns: 100
        }
      );
    });
  });
});
