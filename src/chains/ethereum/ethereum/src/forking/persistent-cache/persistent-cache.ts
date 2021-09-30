import { Tree } from "./tree";
import { promises } from "fs";
import envPaths from "env-paths";
import levelup from "levelup";
import type { LevelUp } from "levelup";
import leveldown from "leveldown";
import sub from "subleveldown";
import encode from "encoding-down";
import * as lexico from "../lexicographic-key-codec";
import {
  BUFFER_EMPTY,
  BUFFER_ZERO,
  Data,
  DATA_EMPTY,
  Quantity
} from "@ganache/utils";
import { Ancestry } from "./ancestry";
import { getBlockNumberFromParams, setDbVersion } from "./helpers";

const { mkdir } = promises;

let counter = 0;
let singletonDb: LevelUp;

const levelupOptions: any = {
  keyEncoding: "binary",
  valueEncoding: "binary"
};
const leveldownOpts = { prefix: "" };

export class PersistentCache {
  public readonly version = BUFFER_ZERO;
  protected db: LevelUp;
  protected cacheDb: LevelUp;
  protected ancestorDb: LevelUp;
  protected ancestry: Ancestry;
  protected hash: Data;
  protected request: any;
  constructor() {}

  static async serializeDb() {
    const cache = await PersistentCache.create();
    return await new Promise(resolve => {
      const rs = cache.ancestorDb.createReadStream({
        keys: true,
        values: true
      });
      const tree = {};
      const collection = {};
      rs.on("data", ({ key, value }) => {
        const node = Tree.deserialize(key, value);
        (node as any).height = node.decodeKey().height.toNumber();
        const keyHex = key.toString("hex");
        const parentKeyHex = node.parent.toString("hex");
        collection[keyHex] = node;
        if (node.parent.length === 0) {
          tree[keyHex] = node;
        } else {
          const descendents = collection[parentKeyHex].descendents || {};
          descendents[keyHex] = node;
          collection[parentKeyHex].descendents = descendents;
        }
        (node as any).hash = Data.from(node.data).toString();
        (node as any).parent =
          node.parent.length > 0
            ? Data.from(collection[parentKeyHex].data).toString()
            : null;
        delete node.key;
        delete node.data;
        delete node.children;
      }).on("end", async () => {
        // deep copy (removes functions)
        await cache.close();
        resolve(JSON.parse(JSON.stringify(tree)));
      });
    });
  }

  static async create() {
    const cache = new PersistentCache();
    if (singletonDb) {
      cache.db = singletonDb;
      await cache.db.open();
      cache.cacheDb = sub(cache.db, "c", levelupOptions);
      await cache.cacheDb.open();
      cache.ancestorDb = sub(cache.db, "a", levelupOptions);
      await cache.ancestorDb.open();
    } else {
      const { data: directory } = envPaths("Ganache/db", { suffix: "" });
      await mkdir(directory, { recursive: true });

      const store = encode(leveldown(directory, leveldownOpts), levelupOptions);
      cache.db = levelup(store);
      await cache.db.open();

      await setDbVersion(cache.db, cache.version);

      cache.cacheDb = sub(cache.db, "c", levelupOptions);
      await cache.cacheDb.open();
      cache.ancestorDb = sub(cache.db, "a", levelupOptions);
      await cache.ancestorDb.open();
      singletonDb = cache.db;
    }
    counter++;
    return cache;
  }

  async init(
    height: Quantity,
    hash: Data,
    request: <T = unknown>(method: string, params: any[]) => Promise<T>
  ) {
    this.hash = hash;
    this.request = request;

    const targetKey = Tree.encodeKey(height, hash);

    let forkBlock: Tree;
    let parentBlock: Tree;
    try {
      const value = await this.ancestorDb.get(targetKey);
      forkBlock = Tree.deserialize(targetKey, value);

      if (forkBlock.parent.equals(BUFFER_EMPTY)) {
        this.ancestry = new Ancestry(this.ancestorDb, forkBlock);
        return;
      }

      parentBlock = Tree.deserialize(
        forkBlock.parent,
        await this.ancestorDb.get(forkBlock.parent)
      );

      this.ancestry = new Ancestry(this.ancestorDb, parentBlock);
    } catch (e) {
      if (!e.notFound) throw e;

      // get the closest known ancestor, or our genesis block
      parentBlock = await this.findClosestAncestor(height);

      // fork block is the same as the "earliest" block
      if (parentBlock.key.equals(targetKey)) {
        this.ancestry = new Ancestry(this.ancestorDb, parentBlock);
        return;
      }
      forkBlock = new Tree(targetKey, this.hash.toBuffer(), parentBlock.key);
    }

    // ensure atomic writes!
    const batch = this.ancestorDb.batch();

    // Search the chain for this block for each child of our ancestor with a
    // block number greater than our own. For each child that we find, we need
    // to:
    //  * update its node to point to us as its `parent`
    //  * update our `parent` to add us as a child
    //  * update our `parent` to remove children that have moved to us
    //  * save us to the database
    const newParentChildren = [forkBlock.key];
    const newNodeChildren = [];

    await Promise.all(
      parentBlock.children.map(async childKey => {
        const { height: childHeight } = Tree.decodeKey(childKey);
        // if the block number is less than our own it can't be our child
        if (childHeight.toBigInt() <= height.toBigInt()) {
          newParentChildren.push(childKey);
          return;
        }

        const childValue = await this.ancestorDb.get(childKey);
        const childNode = Tree.deserialize(childKey, childValue);
        const childRawBlock = await this.fetchBlock(childHeight);
        // if the block doesn't exist on our chain, it can't be our child
        if (
          childRawBlock == null ||
          childRawBlock.hash !== Data.from(childNode.data, 32).toString()
        ) {
          newParentChildren.push(childKey);
          return;
        }

        // do the above for the child as well? maybe we are the parent of the child's children?
        // concern: performance!

        newNodeChildren.push(childNode.key);
        childNode.parent = forkBlock.key;
        batch.put(childNode.key, childNode.serialize());
      })
    );

    parentBlock.children = newParentChildren;
    forkBlock.children = newNodeChildren;

    batch.put(parentBlock.key, parentBlock.serialize());
    batch.put(forkBlock.key, forkBlock.serialize());

    await batch.write();

    this.ancestry = new Ancestry(this.ancestorDb, parentBlock);
  }

  private async findClosestAncestor(height: Quantity) {
    const { number, hash } = await this.request("eth_getBlockByNumber", [
      "earliest",
      false
    ]);

    const startHash = Data.from(hash, 32);
    const start = Tree.encodeKey(Quantity.from(number), startHash);
    const end = Tree.encodeKey(height, DATA_EMPTY);
    const rs = this.ancestorDb.createReadStream({
      gte: start,
      lt: end,
      keys: true,
      values: true,
      reverse: true
    });
    let resolved = false;
    return new Promise<Tree>((resolve, reject) => {
      const handleData = async ({ key, value }) => {
        const node = Tree.deserialize(key, value);
        const { height: candidateHeight } = node.decodeKey();
        rs.pause();
        const block = await this.fetchBlock(candidateHeight);
        // if the chain has a block at this height, and the hash of the
        // block is the same as the one in the db we've found our closest
        // ancestor!
        if (
          !resolved &&
          block !== null &&
          block.hash === Data.from(node.data).toString()
        ) {
          // we've found what we were looking for
          // stop everything we were doing
          rs.off("data", handleData);
          rs.off("end", handleEnd);
          rs.off("error", reject);
          // and destroy the stream
          // `any` here because `destroy` is a thing, I promise!
          // https://nodejs.org/docs/latest-v10.x/api/stream.html#stream_readable_destroy_error
          (rs as any).destroy();

          // and return our data
          resolved = true;
          resolve(Tree.deserialize(key, value));
        } else {
          rs.resume();
        }
      };
      const handleEnd = async () => {
        const node = new Tree(start, startHash.toBuffer(), BUFFER_EMPTY, []);
        resolve(node);
      };
      rs.on("data", handleData).on("error", reject).on("end", handleEnd);
    });
  }

  fetchBlock(height: Quantity) {
    return this.request("eth_getBlockByNumber", [height.toString(), false]);
  }

  get(method: string, params: any[], key: string) {
    const blockNumber = getBlockNumberFromParams(method, params);

    const height = Quantity.from(blockNumber);
    const start = lexico.encode([height.toBuffer(), Buffer.from(key)]);
    const end = lexico.encode([
      Quantity.from(height.toBigInt() + 1n).toBuffer()
    ]);
    const rs = this.cacheDb.createReadStream({
      gt: start,
      lt: end,
      keys: true,
      values: true
    });
    return new Promise<Buffer>((resolve, reject) => {
      let resolved = false;
      const handleData = async ({ key, value }) => {
        const [_height, _key, blockHash] = lexico.decode(key);
        rs.pause();
        if (
          !resolved &&
          (this.hash.toBuffer().equals(blockHash) ||
            (await this.ancestry.has(blockHash)))
        ) {
          // we've found what we were looking for
          // stop everything we were doing
          rs.off("data", handleData);
          rs.off("end", handleEnd);
          rs.off("error", reject);
          // and destroy the stream
          // `any` here because `destroy` is a thing, I promise!
          // https://nodejs.org/docs/latest-v10.x/api/stream.html#stream_readable_destroy_error
          (rs as any).destroy();

          // and return our data
          resolved = true;
          resolve(value);
        } else {
          rs.resume();
        }
      };
      const handleEnd = () => {
        resolve(null);
      };
      rs.on("data", handleData).on("error", reject).on("end", handleEnd);
    });
  }

  put(method: string, params: any[], key: string, value: Buffer) {
    const height = Quantity.from(getBlockNumberFromParams(method, params));
    const dbKey = lexico.encode([
      height.toBuffer(),
      Buffer.from(key),
      this.hash.toBuffer()
    ]);
    return this.cacheDb.put(dbKey, value);
  }

  private status: "closed" | "open" = "open";
  async close() {
    if (this.status === "closed") return;

    this.status = "closed";
    if (this.cacheDb) {
      await this.cacheDb.close();
    }
    if (this.ancestorDb) {
      await this.ancestorDb.close();
    }
    if (this.db) {
      counter--;
      if (counter === 0) {
        const oldDb = singletonDb;
        singletonDb = null;
        await oldDb.close();
      }
    }
  }
}
