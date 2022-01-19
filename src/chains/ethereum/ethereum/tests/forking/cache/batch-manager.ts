export type Ref = {
  hash: string;
  block: Network["historicBlock"];
  children: Set<Ref>;
};

import * as Arbitrary from "./arbitraries";
import { Network, Model } from "./arbitraries";

export class BatchManager {
  public model: Model;
  public networkLookup = new Map<string, Ref>();
  public worldState = new Set<Ref>();
  constructor(model: Model) {
    this.model = model;
  }
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
  findLatestAncestors(batch: Arbitrary.Batch, parent: Ref): Ref[] {
    const block = batch.input.historicBlock;
    const network = this.model.networks[batch.descendantIndex];
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
      candidates.push(...this.findLatestAncestors(batch, child));
    }
    return candidates;
  }

  findLatestAncestor(batch: Arbitrary.Batch, parent: Ref) {
    // find the ancestor with the high block number
    return this.findLatestAncestors(batch, parent).sort((a, b) => {
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
   * @param block -
   * @param network -
   * @param parent -
   * @param allKnownDescendants -
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
   * @param of - collect descendants of this block
   * @param acc - an accumulator
   */
  collectDescendants(of: Ref, acc = new Set<string>()) {
    for (const child of of.children) {
      acc.add(child.block.hash);
      this.collectDescendants(child, acc);
    }
    return acc;
  }
}
