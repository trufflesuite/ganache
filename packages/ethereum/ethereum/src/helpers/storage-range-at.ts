import { Data, findInsertPosition } from "@ganache/utils";
import { decode } from "@ganache/rlp";

import type { LevelUp } from "levelup";
import type {
  StorageRangeAtResult,
  StorageRecords
} from "@ganache/ethereum-utils";
import { Trie } from "@ethereumjs/trie";

type TrieData = { key: Buffer; value: Buffer };
type HashedKeysWithValues = {
  length: number;
  values: Buffer[];
  keys: Buffer[];
  nextKey: Data | null;
};
/**
 * Compares `a` with `b` and returns a boolean indicating whether `a` comes
 * before `b` in sort order. Comparison is based on the actual sequence of bytes
 * in each `Buffer`.
 *
 * * `true` is returned if `a` comes before `b`
 * * `false` is returned if `a` is equal to, or comes after `b`
 *
 * @param a A `Buffer` with which to compare `b`.
 * @param b A `Buffer` with which to compare `a`.
 */
const compare = (a: Buffer, b: Buffer) => a.compare(b) < 0;

/**
 * Iterates over all keys in the trie, drops keys that sort before `startKey`,
 * sorts them, and then returns them in sorted order, along with their values.
 *
 * The `keys` and `values` fields may contain more than `maxKeys` records. The
 * `length` property must be used determine which keys are relevant.
 *
 * The value property is the raw value, it has not been RLP decoded.
 *
 * `nextKey` is set if there are more than `maxKeys` after `startKey`.
 *
 * @param trie
 * @param startKey
 * @param maxKeys
 * @returns
 */
async function getHashedKeysWithValues(
  trie: Trie,
  startKey: Buffer,
  maxKeys: number
) {
  return await new Promise<HashedKeysWithValues>((resolve, reject) => {
    const keys: Buffer[] = [];
    const values: Buffer[] = [];

    trie
      .createReadStream()
      .on("data", function onData({ key, value }: TrieData) {
        // ignore anything that comes before our starting point
        if (startKey.compare(key) > 0) return;

        // insert the key exactly where it needs to go in the array
        const position = findInsertPosition(keys, key, compare);

        // ignore if the value couldn't possibly be relevant (array is full, and
        // this element sorts after the last element we already have)
        // note we _want_ to collect 1 more key than `maxKeys` so we can return
        // `nextKey` if necessary
        if (position > maxKeys) return;

        keys.splice(position, 0, key);
        values.splice(position, 0, value);
      })
      .on("end", function onEnd() {
        const length = keys.length;
        if (length > maxKeys) {
          // we have too many keys, set the `length` to `maxKeys` and return a
          // `nextKey`:
          const nextKey = Data.from(keys[maxKeys]);
          resolve({
            keys,
            length: maxKeys,
            nextKey,
            values
          });
        } else {
          resolve({
            keys,
            length,
            nextKey: null,
            values
          });
        }
      })
      .on("error", reject);
  });
}

/**
 * Given an array of keccak256 hashed `keys` and RLP encoded `values` pairs,
 * look up the "raw" (unhashed) key in the given `database` for each pair,
 * returning a `Record` of `StorageRecord`s for each pair where the Record key
 * is the hashed key and the `Record`'s value is another `Record` where the key
 * is the "raw" key and the value is the RLP decoded `value`.
 *
 * @param hashedKeys - the hash keys
 * @param values - the RLP encode values
 * @param count - the number of pairs from hashedKeys/values to process
 * @param database - the database containing the `hashedKey -> rawKey` index.
 */
export async function getStorage(
  hashedKeys: Buffer[],
  values: Buffer[],
  count: number,
  database: LevelUp
): Promise<StorageRecords> {
  const storage: StorageRecords = {};
  const promises: Promise<void>[] = [];

  for (let i = 0; i < count; i++) {
    const hashedKey = hashedKeys[i];
    promises.push(
      // get the "raw" key using the *hashed* key
      database.get(hashedKey).then((rawKey: Buffer) => {
        storage[Data.toString(hashedKey, 32)] = {
          key: Data.from(rawKey, 32),
          value: Data.from(decode<Buffer>(values[i]), 32)
        };
      })
    );
  }
  await Promise.all(promises);

  return storage;
}

/**
 * Returns storage within the given `storageTrie` given a `startKey` and max
 * number of entries to return (`maxKeys`).
 *
 * `ethereumjs-vm` has a `dumpStorage(account)` method, but we need to honor
 * `startKey` and `maxKeys`, and we do that by not loading every key and
 * value into memory, which `dumpStorage` would do.
 *
 * @param startKey
 * @param maxKeys
 * @param storageTrie
 * @param database
 */
export async function dumpTrieStorageDetails(
  startKey: Buffer,
  maxKeys: number,
  storageTrie: Trie,
  database: LevelUp
): Promise<StorageRangeAtResult> {
  const { keys, length, nextKey, values } = await getHashedKeysWithValues(
    storageTrie,
    startKey,
    maxKeys
  );

  return {
    storage: await getStorage(keys, values, length, database),
    nextKey
  };
}
