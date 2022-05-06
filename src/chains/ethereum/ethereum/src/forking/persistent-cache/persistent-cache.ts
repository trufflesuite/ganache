import { Tree } from "./tree";
import { promises } from "fs";
import envPaths from "env-paths";
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
import type { AbstractIterator, AbstractLevelDOWN } from "abstract-leveldown";
import type { LevelUp } from "levelup";
const levelup = require("levelup");

const levelupOptions = {
  keyEncoding: "binary",
  valueEncoding: "binary"
};
const leveldownOpts = { prefix: "" };
const maxValueByteBuffer = Buffer.from([0xff]);

/**
 * A leveldb-backed cache that enables associating immutable data as it existed
 * at a specific height on a blockchain.
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
  protected hashBuffer: Buffer;
  protected request: Request;
  constructor() { }

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
    await promises.mkdir(directory, { recursive: true });

    const store: AbstractLevelDOWN = encode(leveldown(directory, leveldownOpts), levelupOptions);
    const db = await new Promise<LevelUp>((resolve, reject) => {
      const db = levelup(store, (err: Error) => {
        if (err) return void reject(err);
        resolve(db);
      });
    });
    cache.db = db;
    cache.cacheDb = sub(db, "c", levelupOptions);
    cache.ancestorDb = sub(db, "a", levelupOptions);
    await cache.cacheDb.open();
    await cache.ancestorDb.open();

    await setDbVersion(cache.db, cache.version);
    return cache;
  }

  async initialize(height: Quantity, hash: Data, request: Request) {
    this.hashBuffer = hash.toBuffer();
    this.request = request;

    const {
      targetBlock,
      closestAncestor,
      previousClosestAncestor
    } = await resolveTargetAndClosestAncestor(
      this.ancestorDb,
      this.request,
      height,
      hash
    );

    this.ancestry = new Ancestry(this.ancestorDb, closestAncestor);

    const atomicBatch = this.ancestorDb.batch();

    // if we changed closest ancestors remove our targetBlock from the previous
    // ancestor so our target block doesn't appear in the database more than
    // once, and update our targetBlock to point to this new ancestor
    if (
      previousClosestAncestor &&
      !previousClosestAncestor.key.equals(closestAncestor.key)
    ) {
      targetBlock.closestKnownAncestor = closestAncestor.key;

      const index = previousClosestAncestor.closestKnownDescendants.findIndex(
        buf => buf.equals(targetBlock.key)
      );
      previousClosestAncestor.closestKnownDescendants.splice(index, 1);
      atomicBatch.put(
        previousClosestAncestor.key,
        previousClosestAncestor.serialize()
      );
    }

    let allKnownDescendants = [...targetBlock.closestKnownDescendants];
    // if we don't have a closestAncestor it because the target block is block 0
    if (closestAncestor == null) {
      atomicBatch.put(targetBlock.key, targetBlock.serialize());
    } else {
      const ancestorsDescendants = [targetBlock.key];

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
          // if the block doesn't exist on our chain, it can't be our child,
          // keep it in the parent
          if (
            descendantRawBlock == null ||
            descendantRawBlock.hash !==
            Data.from(descendantNode.hash, 32).toString()
          ) {
            ancestorsDescendants.push(descendantKey);
          } else {
            targetBlock.closestKnownDescendants.push(descendantNode.key);
            // keep track of *all* known descendants so we don't bother
            // checking if they are a known closest descendant later on
            allKnownDescendants.push(...descendantNode.closestKnownDescendants);
            descendantNode.closestKnownAncestor = targetBlock.key;
            // update the descendant node with its newly assigned
            // closestKnownAncestor
            atomicBatch.put(descendantNode.key, descendantNode.serialize());
          }
        })
      );

      closestAncestor.closestKnownDescendants = ancestorsDescendants;
      atomicBatch.put(closestAncestor.key, closestAncestor.serialize());
    }

    // TODO(perf): we always re-save the targetBlock but could optimize to only
    // resave if it is needed.
    atomicBatch.put(targetBlock.key, targetBlock.serialize());

    await atomicBatch.write();

    // we DO want to re-balance the descendants, but we don't want to wait for
    // it because it can't effect our current fork block's cache results since
    // these caches will be for blocks higher than our own fork block
    // Do not `await` this.
    this._reBalancePromise = this.reBalanceDescendantTree(
      height,
      targetBlock,
      allKnownDescendants
    )
      // we don't care if it fails because this is an optimization that only
      // matters for _future_ runs of ganache for blocks beyond our current fork
      // block
      .catch(_ => { })
      .finally(() => {
        this._reBalancePromise = null;
      });
  }

  /**
   * `reBalancePromise` is used at shutdown to ensure we are done balancing the
   * tree
   *
   */
  public _reBalancePromise: Promise<void> = null;

  async getBlock(height: Quantity) {
    return await getBlockByNumber(this.request, height);
  }

  async reBalanceDescendantTree(
    height: Quantity,
    targetBlock: Tree,
    allKnownDescendants: Buffer[]
  ) {
    const atomicBatch = this.ancestorDb.batch();
    const closestKnownDescendants = targetBlock.closestKnownDescendants;
    const startSize = closestKnownDescendants.length;

    for await (const maybeDescendant of findClosestDescendants(
      this.ancestorDb,
      this.request,
      height
    )) {
      const key = maybeDescendant.key;

      // don't match with our own self
      if (targetBlock.key.equals(key)) continue;

      // this possibleDescendent's descendants can't be our direct descendants
      // because trees can't merge
      allKnownDescendants.push(...maybeDescendant.closestKnownDescendants);

      // if this already is a descendent of ours we can skip it
      if (closestKnownDescendants.some(d => d.equals(key))) continue;

      // if this already is a descendent of one of our descendants skip it
      if (allKnownDescendants.some(d => d.equals(key))) continue;

      // move the descendant from the parent to the target
      const parentTree = Tree.deserialize(
        maybeDescendant.closestKnownAncestor,
        await this.ancestorDb.get(maybeDescendant.closestKnownAncestor)
      );
      parentTree.closestKnownDescendants.splice(
        parentTree.closestKnownDescendants.findIndex(d => d.equals(key)),
        1
      );
      maybeDescendant.closestKnownAncestor = targetBlock.key;
      closestKnownDescendants.push(maybeDescendant.key);

      atomicBatch.put(parentTree.key, parentTree.serialize());
      atomicBatch.put(maybeDescendant.key, maybeDescendant.serialize());

      // if the cache has been closed stop doing work so we can flush what we
      // have to the database; descendant resolution shouldn't prevent us from
      // fulling closing.
      if (this.status === "closed") {
        break;
      }
    }

    // only write if we have changes to write
    if (startSize !== closestKnownDescendants.length) {
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
    if (blockNumber == null) return;

    const height = Quantity.from(blockNumber);
    const bufKey = Buffer.from(key);
    const start = lexico.encode([height.toBuffer(), bufKey]);
    const end = Buffer.concat([start, maxValueByteBuffer]);

    const readStream = this.cacheDb.createReadStream({
      gt: start,
      lt: end,
      keys: true,
      values: true
    });

    for await (const data of readStream) {
      const { key: k, value } = (data as any) as { key: Buffer; value: Buffer };
      const [_height, _key, blockHash] = lexico.decode(k);
      // if our key no longer matches make sure we don't keep searching
      if (!_key.equals(bufKey)) return;
      if (this.hashBuffer.equals(blockHash) || (await this.ancestry.has(blockHash))) {
        return value;
      }
    }
  }

  async put(method: string, params: any[], key: string, value: Buffer) {
    const blockNumber = getBlockNumberFromParams(method, params);
    if (blockNumber == null) return false;

    const height = Quantity.from(blockNumber);
    const dbKey = lexico.encode([
      height.toBuffer(),
      Buffer.from(key),
      this.hashBuffer
    ]);
    await this.cacheDb.put(dbKey, value);
    return true;
  }

  private status: "closed" | "open" = "open";
  async close() {
    if (this.status === "closed") return;

    this.status = "closed";
    if (this.cacheDb) {
      await this.cacheDb.close();
    }
    if (this.ancestorDb) {
      await this._reBalancePromise;
      await this.ancestorDb.close();
    }
    if (this.db) {
      await this.db.close();
    }
  }
}
