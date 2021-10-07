import { BUFFER_EMPTY } from "@ganache/utils";
import { LevelWait } from "./level-wait";
import { Tree } from "./tree";

export class Ancestry {
  private db: LevelWait;
  private next: Buffer;
  private knownAncestors: Set<string>;
  private lock: Map<string, Promise<void>> = new Map();
  constructor(db: LevelWait, parent: Tree) {
    this.db = db;
    if (parent == null) {
      this.next = null;
      this.knownAncestors = new Set();
    } else {
      this.next = parent.closestKnownAncestor.equals(BUFFER_EMPTY)
        ? null
        : parent.closestKnownAncestor;
      this.knownAncestors = new Set([parent.key.toString("hex")]);
    }
  }

  private async loadNextAncestor(next: Buffer) {
    const k = next.toString("hex");
    if (this.lock.has(k)) {
      throw new Error("could not obtain lock");
    }
    let resolver: () => void;
    this.lock.set(
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
    this.knownAncestors.add(node.key.toString("hex"));
    this.lock.delete(k);
    resolver();
  }

  async has(key: Buffer) {
    const strKey = key.toString("hex");
    if (this.knownAncestors.has(strKey)) {
      return true;
    } else if (this.next) {
      const lock = this.lock.get(this.next.toString("hex"));
      if (lock) {
        await lock;
        return this.has(key);
      }
      await this.loadNextAncestor(this.next);
      return this.has(key);
    } else {
      return false;
    }
  }
}
