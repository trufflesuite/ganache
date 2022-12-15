import { BUFFER_EMPTY } from "@ganache/utils";
import { GanacheLevelUp } from "../../database";
import { Tree } from "./tree";

export class Ancestry {
  private db: GanacheLevelUp;
  private next: Buffer;
  private knownAncestors: Set<string>;
  /**
   * Prevents fetching the same key from the database simultaneously.
   */
  private cacheLock: Map<string, Promise<void>> = new Map();
  constructor(db: GanacheLevelUp, parent: Tree) {
    this.db = db;
    if (parent == null) {
      this.next = null;
      this.knownAncestors = new Set();
    } else {
      this.next = parent.closestKnownAncestor.equals(BUFFER_EMPTY)
        ? null
        : parent.closestKnownAncestor;
      this.knownAncestors = new Set([parent.hash.toString("hex")]);
    }
  }

  private async loadNextAncestor(next: Buffer) {
    const k = next.toString("hex");
    if (this.cacheLock.has(k)) {
      throw new Error("couldn't load next ancestor as it is locked");
    }
    let resolver: () => void;
    this.cacheLock.set(
      k,
      new Promise<void>(resolve => {
        resolver = resolve;
      })
    );
    const value = await this.db.get(next);
    const node = Tree.deserialize(next, value);
    this.next = node.closestKnownAncestor.equals(BUFFER_EMPTY)
      ? null
      : node.closestKnownAncestor;
    this.knownAncestors.add(node.hash.toString("hex"));
    this.cacheLock.delete(k);
    resolver();
  }

  async has(key: Buffer) {
    const strKey = key.toString("hex");
    if (this.knownAncestors.has(strKey)) {
      return true;
    } else if (this.next) {
      const cacheLock = this.cacheLock.get(this.next.toString("hex"));
      if (cacheLock) {
        await cacheLock;
        return this.has(key);
      }
      await this.loadNextAncestor(this.next);
      return this.has(key);
    } else {
      return false;
    }
  }
}
