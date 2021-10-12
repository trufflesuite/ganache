import * as fc from "fast-check";

import * as Arbitrary from "./cache/arbitraries";
import { Network, Model } from "./cache/arbitraries";

import { PersistentCache } from "../../src/forking/persistent-cache/persistent-cache";

import { Data, Quantity } from "@ganache/utils";
import { Tree } from "../../src/forking/persistent-cache/tree";
import assert from "assert";
import Block from "ethereumjs-block";

type Ref = {
  hash: string;
  block: Network["historicBlock"];
  children: Set<Ref>;
};

class BatchManager {
  public networkLookup: Map<string, Ref>;
  public worldState: Set<Ref>;
  constructor() {}
  getGenesis(network: Network) {
    // Get the genesis block and add it to our world state, if needed.
    const genesis = network.getBlockByNumber(0) as Network["historicBlock"];
    if (!this.networkLookup.has(genesis.hash)) {
      const genesisRef: Ref = {
        hash: genesis.hash,
        block: genesis,
        children: new Set()
      };
      this.networkLookup.set(genesis.hash, genesisRef);
      this.worldState.add(genesisRef);
      return genesisRef;
    } else {
      return this.networkLookup.get(genesis.hash);
    }
  }
  getOwnRef(block: Network["historicBlock"]) {
    if (!this.networkLookup.has(block.hash)) {
      const ref: Ref = {
        hash: block.hash,
        block: block,
        children: new Set()
      };
      // if we don't yet know about this block, add it
      this.networkLookup.set(block.hash, ref);
      return ref;
    } else {
      return this.networkLookup.get(block.hash);
    }
  }
  findLatestAncestors(
    block: Network["historicBlock"],
    network: Network,
    parent: Ref
  ): Ref[] {
    const candidates: Ref[] = [parent];
    for (const child of parent.children.values()) {
      if (child.hash === block.hash) {
        // if the child is the same block as us we must delete it
        // because we are figuring this all out again anyway
        parent.children.delete(child);
        continue;
      }

      const networkBlock = network.getBlockByNumber(child.block.number);
      const isInNetwork = networkBlock && networkBlock.hash === child.hash;
      if (!isInNetwork) continue;

      // if the child is in network and comes after us it is
      // an eventual *descendant*. continue searching!
      if (child.block.number >= block.number) continue;

      // otherwise, it might be our ancestor, keep checking more!
      candidates.push(...this.findLatestAncestors(block, network, child));
    }
    return candidates;
  }

  findLatestAncestor(
    block: Network["historicBlock"],
    network: Network,
    parent: Ref
  ) {
    // find the ancestor with the high block number
    return this.findLatestAncestors(block, network, parent).sort((a, b) => {
      if (a.block.number < b.block.number) {
        return 1;
      } else if (a.block.number === b.block.number) {
        return 0;
      } else {
        return -1;
      }
    })[0];
  }

  /**
   * traverse up all descendants to fix those relationships
   * @param block
   * @param network
   * @param parent
   * @param allKnownDescendants
   */
  fixDescendants(
    block: Ref,
    network: Network,
    parent: Ref,
    allKnownDescendants: Set<string>
  ) {
    const children = [...parent.children.values()];
    for (const child of children) {
      const networkBlock = network.getBlockByNumber(child.block.number);
      const isInNetwork = networkBlock && networkBlock.hash === child.hash;
      if (!isInNetwork) continue;

      // we should move the child if it comes after us
      if (child.block.number > block.block.number) {
        parent.children.delete(child);
        block.children.add(child);
        allKnownDescendants.add(child.hash);
      } else {
        this.fixDescendants(block, network, child, allKnownDescendants);
      }
    }
  }

  /**
   * @param of collect descendants of this block
   * @param acc an accumulator
   */
  collectDescendants(of: Ref, acc = new Set<string>()) {
    for (const child of of.children) {
      acc.add(child.block.hash);
      this.collectDescendants(child, acc);
    }
    return acc;
  }
}

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
          // make sure this cache doesn't already exist
          await PersistentCache.deleteDb(dbName);
          try {
            const batchManager = new BatchManager();
            for (const batch of batches) {
              const block = batch.input.historicBlock;
              const network = model.networks[batch.descendantIndex];

              const genesisRef = batchManager.getGenesis(network);
              const ref = batchManager.getOwnRef(block);

              if (block.number > 0) {
                const latestAncestor = batchManager.findLatestAncestor(
                  block,
                  network,
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

              try {
                assert.deepStrictEqual(batchManager.worldState, cacheState);
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
          numRuns: 10000,
          endOnFailure: true
          // seed: -1336914165,
          // path:
          //   "492:3332:23:26:25:25:28:27:34:28:20:19:12:21:9:9:20:11:9:9:12:9:11:12:9:23"
        }
      );
    });
  });
});
