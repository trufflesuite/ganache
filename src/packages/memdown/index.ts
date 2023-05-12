import {
  AbstractLevel,
  AbstractIterator,
  AbstractValueIterator,
  NodeCallback,
  AbstractKeyIterator
} from "abstract-level";
import type {
  AbstractDatabaseOptions,
  AbstractPutOptions,
  AbstractGetOptions,
  AbstractGetManyOptions,
  AbstractSeekOptions,
  AbstractDelOptions,
  AbstractBatchOperation,
  AbstractClearOptions,
  AbstractKeyIteratorOptions,
  AbstractIteratorOptions,
  AbstractValueIteratorOptions
} from "abstract-level";

import createRBT from "functional-red-black-tree";
import { NextCallback } from "abstract-level/types/abstract-iterator";
import createRBTree from "functional-red-black-tree";

const rangeOptions = new Set(["gt", "gte", "lt", "lte"]);
const kNone = Symbol("none");
const kTree = Symbol("tree");
const kIterator = Symbol("iterator");
const kLowerBound = Symbol("lowerBound");
const kUpperBound = Symbol("upperBound");
const kOutOfRange = Symbol("outOfRange");
const kReverse = Symbol("reverse");
const kOptions = Symbol("options");
const kTest = Symbol("test");
const kAdvance = Symbol("advance");
const kInit = Symbol("init");

function gt(this: MemoryIterator, value: Buffer) {
  return Buffer.compare(value, this[kUpperBound]) > 0;
}

function gte(this: MemoryIterator, value: Buffer) {
  return Buffer.compare(value, this[kUpperBound]) >= 0;
}

function lt(this: MemoryIterator, value: Buffer) {
  return Buffer.compare(value, this[kUpperBound]) < 0;
}

function lte(this: MemoryIterator, value: Buffer) {
  return Buffer.compare(value, this[kUpperBound]) <= 0;
}

class MemoryIterator extends AbstractIterator<any, Buffer, Buffer> {
  constructor(db: any, options: AbstractIteratorOptions<Buffer, Buffer>) {
    super(db, options);
    this[kInit](db[kTree], options);
  }

  _next(): Promise<[Buffer, Buffer]>;
  _next(callback: NextCallback<Buffer, Buffer>): void;
  _next(callback?: NextCallback<Buffer, Buffer>) {
    if (!this[kIterator].valid) return callback(null);

    const key = this[kIterator].key;
    const value = this[kIterator].value;

    if (!this[kTest](key)) return callback(null);

    this[kIterator][this[kAdvance]]();
    if (callback) {
      callback(null, key, value);
    } else {
      return Promise.resolve([key, value]);
    }
  }
  //@ts-ignore
  _nextv(
    size: number,
    options: {},
    callback: NodeCallback<[[Buffer, Buffer]]>
  ) {
    const it = this[kIterator];
    const entries: [Buffer, Buffer][] = [];

    while (it.valid && entries.length < size && this[kTest](it.key)) {
      entries.push([it.key, it.value]);
      it[this[kAdvance]]();
    }

    callback(null, entries as [[Buffer, Buffer]]);
  }
  //@ts-ignore
  _all(options: {}, callback: NodeCallback<[[Buffer, Buffer]]>) {
    const size = this.limit - this.count;
    const it = this[kIterator];
    const entries: [K: Buffer, V: Buffer][] = [];

    while (it.valid && entries.length < size && this[kTest](it.key)) {
      entries.push([it.key, it.value]);
      it[this[kAdvance]]();
    }

    callback(null, entries as [[Buffer, Buffer]]);
  }
}

class MemoryKeyIterator extends AbstractKeyIterator<any, Buffer> {
  constructor(db: any, options: AbstractIteratorOptions<Buffer, Buffer>) {
    super(db, options);
    this[kInit](db[kTree], options);
  }
  //@ts-ignore
  _next(callback: NodeCallback<Buffer>) {
    if (!this[kIterator].valid) return callback(null);

    const key = this[kIterator].key;
    if (!this[kTest](key)) return callback(null);

    this[kIterator][this[kAdvance]]();
    callback(null, key);
  }
  //@ts-ignore
  _nextv(size: number, options: {}, callback: NodeCallback<[Buffer]>) {
    const it = this[kIterator];
    const keys: Buffer[] = [];

    while (it.valid && keys.length < size && this[kTest](it.key)) {
      keys.push(it.key);
      it[this[kAdvance]]();
    }

    callback(null, keys as [Buffer]);
  }
  //@ts-ignore
  _all(options: {}, callback: NodeCallback<[Buffer]>) {
    const size = this.limit - this.count;
    const it = this[kIterator];
    const keys: Buffer[] = [];

    while (it.valid && keys.length < size && this[kTest](it.key)) {
      keys.push(it.key);
      it[this[kAdvance]]();
    }

    callback(null, keys as [Buffer]);
  }
}

class MemoryValueIterator extends AbstractValueIterator<any, Buffer, Buffer> {
  constructor(db: any, options: AbstractValueIteratorOptions<Buffer, Buffer>) {
    super(db, options);
    this[kInit](db[kTree], options);
  }
  //@ts-ignore
  _next(callback: NodeCallback<Buffer>) {
    if (!this[kIterator].valid) return callback(null);

    const key = this[kIterator].key;
    const value = this[kIterator].value;

    if (!this[kTest](key)) return callback(null);

    this[kIterator][this[kAdvance]]();
    callback(null, value);
  }
  //@ts-ignore
  _nextv(size: number, options: {}, callback: NodeCallback<[Buffer]>) {
    const it = this[kIterator];
    const values: Buffer[] = [];

    while (it.valid && values.length < size && this[kTest](it.key)) {
      values.push(it.value);
      it[this[kAdvance]]();
    }

    callback(null, values as [Buffer]);
  }
  //@ts-ignore
  _all(options: {}, callback: NodeCallback<[Buffer]>) {
    const size = this.limit - this.count;
    const it = this[kIterator];
    const values: Buffer[] = [];

    while (it.valid && values.length < size && this[kTest](it.key)) {
      values.push(it.value);
      it[this[kAdvance]]();
    }

    callback(null, values as [Buffer]);
  }
}

for (const Ctor of [MemoryIterator, MemoryKeyIterator, MemoryValueIterator]) {
  Ctor.prototype[kInit] = function (
    tree: createRBTree.Tree<Buffer, Buffer>,
    options: any
  ) {
    this[kReverse] = options.reverse;
    this[kOptions] = options;

    if (!this[kReverse]) {
      this[kAdvance] = "next";
      this[kLowerBound] =
        "gte" in options ? options.gte : "gt" in options ? options.gt : kNone;
      this[kUpperBound] =
        "lte" in options ? options.lte : "lt" in options ? options.lt : kNone;

      if (this[kLowerBound] === kNone) {
        this[kIterator] = tree.begin;
      } else if ("gte" in options) {
        this[kIterator] = tree.ge(this[kLowerBound]);
      } else {
        this[kIterator] = tree.gt(this[kLowerBound]);
      }

      if (this[kUpperBound] !== kNone) {
        this[kTest] = "lte" in options ? lte : lt;
      }
    } else {
      this[kAdvance] = "prev";
      this[kLowerBound] =
        "lte" in options ? options.lte : "lt" in options ? options.lt : kNone;
      this[kUpperBound] =
        "gte" in options ? options.gte : "gt" in options ? options.gt : kNone;

      if (this[kLowerBound] === kNone) {
        this[kIterator] = tree.end;
      } else if ("lte" in options) {
        this[kIterator] = tree.le(this[kLowerBound]);
      } else {
        this[kIterator] = tree.lt(this[kLowerBound]);
      }

      if (this[kUpperBound] !== kNone) {
        this[kTest] = "gte" in options ? gte : gt;
      }
    }
  };

  Ctor.prototype[kTest] = function () {
    return true;
  };

  Ctor.prototype[kOutOfRange] = function (target: Buffer) {
    if (!this[kTest](target)) {
      return true;
    } else if (this[kLowerBound] === kNone) {
      return false;
    } else if (!this[kReverse]) {
      if ("gte" in this[kOptions]) {
        return Buffer.compare(target, this[kLowerBound]) < 0;
      } else {
        return Buffer.compare(target, this[kLowerBound]) <= 0;
      }
    } else {
      if ("lte" in this[kOptions]) {
        return Buffer.compare(target, this[kLowerBound]) > 0;
      } else {
        return Buffer.compare(target, this[kLowerBound]) >= 0;
      }
    }
  };

  //@ts-ignore
  Ctor.prototype._seek = function (
    target: Buffer,
    options?: AbstractSeekOptions<Buffer>
  ) {
    if (this[kOutOfRange](target)) {
      this[kIterator] = this[kIterator].tree.end;
      this[kIterator].next();
    } else if (this[kReverse]) {
      this[kIterator] = this[kIterator].tree.le(target);
    } else {
      this[kIterator] = this[kIterator].tree.ge(target);
    }
  };
}

export class MemoryLevel extends AbstractLevel<any, Buffer, Buffer> {
  constructor(
    location: any,
    options?: AbstractDatabaseOptions<Buffer, Buffer>
  ) {
    // Take a dummy location argument to align with other implementations
    if (typeof location === "object" && location !== null) {
      options = location;
    }

    super(
      {
        seek: true,
        permanence: false,
        createIfMissing: false,
        errorIfExists: false,
        encodings: { buffer: true }
      },
      options || {}
    );

    this[kTree] = createRBT<Buffer, Buffer>(Buffer.compare);
  }
  //@ts-ignore
  _put(
    key: Buffer,
    value: Buffer,
    options: AbstractPutOptions<Buffer, Buffer>,
    callback: NodeCallback<Buffer>
  ) {
    const it = this[kTree].find(key);

    if (it.valid) {
      this[kTree] = it.update(value);
    } else {
      this[kTree] = this[kTree].insert(key, value);
    }

    callback(null);
  }
  //@ts-ignore
  _get(
    key: Buffer,
    options: AbstractGetOptions<Buffer, Buffer>,
    callback: NodeCallback<Buffer>
  ) {
    const value = this[kTree].get(key);

    if (typeof value === "undefined") {
      // TODO: use error code (not urgent, abstract-level normalizes this)
      return callback(new Error("NotFound"));
    }

    callback(null, value);
  }
  //@ts-ignore
  _getMany(
    keys: Buffer[],
    options: AbstractGetManyOptions<Buffer, Buffer>,
    callback: NodeCallback<Buffer[]>
  ) {
    callback(
      null,
      keys.map(key => this[kTree].get(key))
    );
  }
  //@ts-ignore
  _del(
    key: Buffer,
    options: AbstractDelOptions<Buffer>,
    callback: NodeCallback<void>
  ) {
    this[kTree] = this[kTree].remove(key);
    callback(null);
  }
  //@ts-ignore
  _batch(
    operations: AbstractBatchOperation<this, Buffer, Buffer>[],
    options,
    callback: NodeCallback<void>
  ) {
    let tree = this[kTree];

    for (const op of operations) {
      const key = op.key;
      const it = tree.find(key);

      if (op.type === "put") {
        tree = it.valid ? it.update(op.value) : tree.insert(key, op.value);
      } else {
        tree = it.remove();
      }
    }

    this[kTree] = tree;
    callback(null);
  }
  //@ts-ignore
  _clear(options: AbstractClearOptions<Buffer>, callback: NodeCallback<void>) {
    if (options.limit === -1 && !Object.keys(options).some(isRangeOption)) {
      // Delete everything by creating a new empty tree.
      this[kTree] = createRBT(Buffer.compare);
      return callback(null);
    }

    const iterator = this.keys({ ...options });
    const limit = iterator.limit;

    let count = 0;

    const loop = () => {
      // TODO: add option to control "batch size"
      for (let i = 0; i < 500; i++) {
        if (++count > limit) return callback(null);
        if (!iterator[kIterator].valid) return callback(null);
        if (!iterator[kTest](iterator[kIterator].key)) return callback(null);

        // Must also include changes made in parallel to clear()
        this[kTree] = this[kTree].remove(iterator[kIterator].key);
        iterator[kIterator][iterator[kAdvance]]();
      }

      // Some time to breathe
      this.nextTick(loop);
    };

    this.nextTick(loop);
  }
  //@ts-ignore
  _iterator(options?: AbstractIteratorOptions<Buffer, Buffer>) {
    return new MemoryIterator(this, options);
  }
  //@ts-ignore
  _keys(options?: AbstractKeyIteratorOptions<Buffer>) {
    return new MemoryKeyIterator(this, options);
  }

  //@ts-ignore
  _values(options?: AbstractValueIteratorOptions<Buffer, Buffer>) {
    return new MemoryValueIterator(this, options);
  }
}

function isRangeOption(k: string) {
  return rangeOptions.has(k);
}
