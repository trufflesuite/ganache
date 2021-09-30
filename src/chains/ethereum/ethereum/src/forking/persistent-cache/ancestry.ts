import { BUFFER_EMPTY } from "@ganache/utils";
import type { LevelUp } from "levelup";
import { Tree } from "./tree";

export class Ancestry {
  private db: LevelUp;
  private next: Buffer;
  private knownAncestors: Set<string>;
  private lock: Map<string, Promise<void>> = new Map();
  constructor(db: LevelUp, parent: Tree) {
    this.db = db;
    this.next = parent.parent.equals(BUFFER_EMPTY) ? null : parent.parent;
    this.knownAncestors = new Set([parent.key.toString("hex")]);
  }

  private async addNextAncestor(next: Buffer) {
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
    console.log("height: " + node.decodeKey().height);
    this.next = node.parent.equals(BUFFER_EMPTY) ? null : node.parent;
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
      await this.addNextAncestor(this.next);
      return this.has(key);
    } else {
      return false;
    }
  }
}
