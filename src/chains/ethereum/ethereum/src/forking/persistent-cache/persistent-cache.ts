import { Tree } from "./tree";
import { promises } from "fs";
import envPaths from "env-paths";
import levelup, { LevelUp } from "levelup";
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
import { AbstractIterator } from "abstract-leveldown";
import { AbstractLevelDOWN } from "abstract-leveldown";

const { mkdir } = promises;

const levelupOptions = {
  keyEncoding: "binary",
  valueEncoding: "binary"
};
const leveldownOpts = { prefix: "" };

/**
 * A leveldb-backed cache that enables associating immutable data as it existed
 * at a specific height on a blockchain.
 *
 * Note:
 *
 * The relationships between blocks are valid, but not stable. Race
 * contention between multiple processes is possible; this may cause
 * relationships between blocks to be lost if multiple writes to the same blocks
 * occur nearly simultaneously.
 *
 * This will not cause a loss of data, but may result in increased cache misses.
 *
 * The design affords faster db reads (one read to get known closest ancestors
 * and descendants) and fast db writes (one write per node in a relationship).
 */
export class PersistentCache {
  public readonly version = BUFFER_ZERO;
  protected db: LevelUp<AbstractLevelDOWN, AbstractIterator<Buffer, Buffer>>;
  protected cacheDb: LevelUp<
    AbstractLevelDOWN,
    AbstractIterator<Buffer, Buffer>
  >;
  protected ancestorDb: LevelUp<
    AbstractLevelDOWN,
    AbstractIterator<Buffer, Buffer>
  >;
  protected ancestry: Ancestry;
  protected hash: Data;
  protected request: Request;
  constructor() {}

  static async deleteDb(dbSuffix?: string) {
    return new Promise((resolve, reject) => {
      const directory = PersistentCache.getDbDirectory(dbSuffix);
      leveldown.destroy(directory, err => {
        if (err) return void reject(err);
        resolve(void 0);
      });
    });
  }
  /**
   * Serializes the entire database world state into a JSON tree
   */
  static async serializeDb(dbSuffix?: string) {
    const cache = await PersistentCache.create(dbSuffix);
    type Tree = Record<string, { descendants: Tree }>;
    return await new Promise<Tree>(async resolve => {
      const rs = cache.ancestorDb.createReadStream({
        gte: BUFFER_ZERO,
        keys: true,
        values: true
      });
      const tree: Tree = {};
      const collection = {};
      for await (const data of rs) {
        const { key, value } = (data as any) as { key: Buffer; value: Buffer };

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
            ? Data.from(collection[parentKeyHex].hash).toString()
            : null;
        delete node.key;
        // delete node.hash;
        delete node.closestKnownDescendants;
        delete node.closestKnownAncestor;
      }
      await cache.close();
      resolve(JSON.parse(JSON.stringify(tree)) as Tree);
    });
  }

  static getDbDirectory(suffix: string = "") {
    const { data: directory } = envPaths("Ganache/db", {
      suffix
    });
    return directory;
  }

  static async create(dbSuffix?: string) {
    const cache = new PersistentCache();

    const directory = PersistentCache.getDbDirectory(dbSuffix);
    await mkdir(directory, { recursive: true });

    const store = encode(leveldown(directory, leveldownOpts), levelupOptions);
    const db = await new Promise<LevelUp>((resolve, reject) => {
      const db = levelup(store, (err: Error) => {
        if (err) return void reject(err);
        resolve(db);
      });
    });
    console.log("opened!");
    cache.db = db;
    cache.cacheDb = sub(db, "c", levelupOptions);
    cache.ancestorDb = sub(db, "a", levelupOptions);
    console.log("await cache.cacheDb.open();");
    await cache.cacheDb.open();
    console.log("await cache.ancestorDb.open();");
    await cache.ancestorDb.open();

    await setDbVersion(cache.db, cache.version);
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

    let allKnownDescendants = [];
    // if we don't have a closestAncestor it because the target block is block 0
    if (closestAncestor == null) {
      allKnownDescendants = targetBlock.closestKnownDescendants;
      await this.ancestorDb.put(targetBlock.key, targetBlock.serialize());
    } else {
      const atomicBatch = this.ancestorDb.batch();

      const ancestorsDescendants = [targetBlock.key];
      const newNodeClosestKnownDescendants: Buffer[] = [];

      await Promise.all(
        closestAncestor.closestKnownDescendants.map(async descendantKey => {
          // don't match ourself
          if (descendantKey.equals(targetBlock.key)) return;

          const { height: descendantHeight } = Tree.decodeKey(descendantKey);
          // if the block number is less than our own it can't be our descendant
          if (descendantHeight.toBigInt() <= height.toBigInt()) {
            ancestorsDescendants.push(descendantKey);
            return;
          }

          const descendantValue = await this.ancestorDb.get(descendantKey);
          const descendantNode = Tree.deserialize(
            descendantKey,
            descendantValue
          );

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
            newNodeClosestKnownDescendants.push(descendantNode.key);
            // keep track of *all* known descendants do we don't bother
            // checking if they are a known closest descendant later on
            allKnownDescendants.push(...descendantNode.closestKnownDescendants);
            descendantNode.closestKnownAncestor = targetBlock.key;
            // update the descendant node with it's newly assigned
            // closestKnownAncestor
            atomicBatch.put(descendantNode.key, descendantNode.serialize());
          }
        })
      );

      closestAncestor.closestKnownDescendants = ancestorsDescendants;
      targetBlock.closestKnownDescendants = newNodeClosestKnownDescendants;

      atomicBatch.put(closestAncestor.key, closestAncestor.serialize());
      atomicBatch.put(targetBlock.key, targetBlock.serialize());

      await atomicBatch.write();
    }

    // we DO want to re-balance the descendants, but we don't want to wait for
    // it because it can't effect our current fork block's cache results since
    // these caches will be for blocks higher than our own fork block
    // Do not `await` this.
    this.rebalanceDescendantTree(
      height,
      targetBlock,
      allKnownDescendants
    ).catch(_ => {}); // if it fails, it fails.
  }

  async getBlock(height: Quantity) {
    return await getBlockByNumber(this.request, height);
  }

  async rebalanceDescendantTree(
    height: Quantity,
    targetBlock: Tree,
    allKnownDescendants: Buffer[]
  ) {
    const atomicBatch = this.ancestorDb.batch();
    const newClosestKnownDescendants = targetBlock.closestKnownDescendants;
    const startSize = newClosestKnownDescendants.length;

    for await (const maybeDescendant of findClosestDescendants(
      this.ancestorDb,
      this.request,
      height
    )) {
      const key = maybeDescendant.key;

      // don't match with our own self
      if (targetBlock.key.equals(key)) continue;

      // if this already is a descendent of ours we can skip it
      if (newClosestKnownDescendants.some(d => d.equals(key))) continue;

      // this possibleDescendent's descendants can't be our direct descendants
      // because trees can't merge
      allKnownDescendants.push(...maybeDescendant.closestKnownDescendants);

      // if this already is a descendent of one of our descendants skip it
      if (allKnownDescendants.some(d => d.equals(key))) continue;

      maybeDescendant.closestKnownAncestor = targetBlock.key;
      newClosestKnownDescendants.push(maybeDescendant.key);

      atomicBatch.put(maybeDescendant.key, maybeDescendant.serialize());
    }

    // only write if we have changes to write
    if (startSize !== newClosestKnownDescendants.length) {
      targetBlock.closestKnownDescendants = newClosestKnownDescendants;
      atomicBatch.put(targetBlock.key, targetBlock.serialize());

      // check `this.ancestorDb.isOpen()` as we don't need to try to write if
      // the db was shutdown in the meantime. This can happen if ganache was
      // closed while we were still updating the descendants
      if (atomicBatch.length > 0 && this.ancestorDb.isOpen())
        await atomicBatch.write();
    }
  }

  async get(method: string, params: any[], key: string) {
    const blockNumber = getBlockNumberFromParams(method, params);
    const height = Quantity.from(blockNumber);
    const start = lexico.encode([height.toBuffer(), Buffer.from(key)]);
    const end = lexico.encode([
      Quantity.from(height.toBigInt() + 1n).toBuffer()
    ]);
    const readStream = this.cacheDb.createReadStream({
      gt: start,
      lt: end,
      keys: true,
      values: true
    });
    const hashBuf = this.hash.toBuffer();
    for await (const data of readStream) {
      const { key, value } = (data as any) as { key: Buffer; value: Buffer };
      const [_height, _key, blockHash] = lexico.decode(key);
      if (hashBuf.equals(blockHash) || (await this.ancestry.has(blockHash))) {
        return value;
      }
    }
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
      await this.db.close();
    }
  }
}
