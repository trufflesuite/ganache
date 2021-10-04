import { Tree } from "./tree";
import { promises } from "fs";
import envPaths from "env-paths";
import levelup from "levelup";
import type { LevelUp } from "levelup";
import leveldown from "leveldown";
import sub from "subleveldown";
import encode from "encoding-down";
import * as lexico from "../lexicographic-key-codec";
import { BUFFER_ZERO, Data, Quantity } from "@ganache/utils";
import { Ancestry } from "./ancestry";
import {
  resolveTargetAndClosestAncestor,
  getBlockByNumber,
  getBlockNumberFromParams,
  Request,
  setDbVersion,
  findClosestDescendants
} from "./helpers";

const { mkdir } = promises;

// TODO: connect over ipc to a single global (versioned) process.
let counter = 0;
let singletonDb: LevelUp;

const levelupOptions = {
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
  protected request: Request;
  constructor() {}

  /**
   * Serializes the entire database world state into a JSON tree
   */
  static async serializeDb() {
    const cache = await PersistentCache.create();
    type Tree = Record<string, { descendants: Record<string, Tree> }>;
    return await new Promise<Tree>(resolve => {
      const rs = cache.ancestorDb.createReadStream({
        keys: true,
        values: true
      });
      const tree: Tree = {};
      const collection = {};
      rs.on("data", ({ key, value }) => {
        const node = Tree.deserialize(key, value);
        (node as any).height = node.decodeKey().height.toNumber();
        const keyHex = key.toString("hex");
        const parentKeyHex = node.closestKnownAncestor.toString("hex");
        collection[keyHex] = node;
        if (node.closestKnownAncestor.length === 0) {
          tree[keyHex] = node as any;
        } else {
          const descendants = collection[parentKeyHex].descendants || {};
          descendants[keyHex] = node;
          collection[parentKeyHex].descendants = descendants;
        }
        (node as any).hash = Data.from(node.hash).toString();
        (node as any).parent =
          node.closestKnownAncestor.length > 0
            ? Data.from(collection[parentKeyHex].data).toString()
            : null;
        delete node.key;
        delete node.hash;
        delete node.closestKnownDescendants;
        delete node.closestKnownAncestor;
      }).on("end", async () => {
        // deep copy (removes functions)
        await cache.close();
        resolve(JSON.parse(JSON.stringify(tree)) as Tree);
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

  async initialize(height: Quantity, hash: Data, request: Request) {
    this.hash = hash;
    this.request = request;

    const {
      targetBlock,
      closestAncestor
    } = await resolveTargetAndClosestAncestor(
      this.ancestorDb,
      this.request,
      height,
      hash
    );

    this.ancestry = new Ancestry(this.ancestorDb, closestAncestor);

    const atomicBatch = this.ancestorDb.batch();

    const ancestorsDescendants = [targetBlock.key];
    const newNodeDescendants = [];

    await Promise.all(
      closestAncestor.closestKnownDescendants.map(async descendantKey => {
        const { height: descendantHeight } = Tree.decodeKey(descendantKey);
        // if the block number is less than our own it can't be our descendant
        if (descendantHeight.toBigInt() <= height.toBigInt()) {
          ancestorsDescendants.push(descendantKey);
          return;
        }

        const descendantValue = await this.ancestorDb.get(descendantKey);
        const descendantNode = Tree.deserialize(descendantKey, descendantValue);

        const descendantRawBlock = await this.getBlock(descendantHeight);
        // if the block doesn't exist on our chain, it can't be our child, keep
        // it in the parent
        if (
          descendantRawBlock == null ||
          descendantRawBlock.hash !==
            Data.from(descendantNode.hash, 32).toString()
        ) {
          ancestorsDescendants.push(descendantKey);
        } else {
          newNodeDescendants.push(descendantNode.key);
          descendantNode.closestKnownAncestor = targetBlock.key;
          // update the descendant node with it's newly assigned
          // closestKnownAncestor
          atomicBatch.put(descendantNode.key, descendantNode.serialize());
        }
      })
    );

    for await (const possibleDescendent of findClosestDescendants(
      this.ancestorDb,
      this.request,
      height
    )) {
      possibleDescendent;
    }
    closestAncestor.closestKnownDescendants = ancestorsDescendants;
    targetBlock.closestKnownDescendants = newNodeDescendants;

    atomicBatch.put(closestAncestor.key, closestAncestor.serialize());
    atomicBatch.put(targetBlock.key, targetBlock.serialize());

    await atomicBatch.write();
  }

  async getBlock(height: Quantity) {
    return await getBlockByNumber(this.request, height);
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
