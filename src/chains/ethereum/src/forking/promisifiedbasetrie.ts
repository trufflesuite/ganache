import BaseTrie, { LargeNumber, FindPathCallback, Callback } from "merkle-patricia-tree/baseTrie";
import TrieNode from "merkle-patricia-tree/trieNode";

export type FindPathObject = {
  node: TrieNode, 
  keyRemainder: Buffer, 
  stack: TrieNode[]
}

// We use this class to promisify functions on the BaseTrie
// that we'd otherwise have to use callbacks for. Note that
// these overrides still allow callbacks to be passed, and
// called as normal. 
export default class PromisifiedBaseTrie extends BaseTrie {
  // Note: This function overrides a function on the BaseTrie
  // Overridden only to allow async/await, for sanity.
  async get(key:LargeNumber, callback?:Callback<Buffer>):Promise<Buffer> {
    if (callback) {
      super.get(key, callback);
    }

    return new Promise((resolve, reject) => {
      super.get(key, (err:Error, result:Buffer) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      })
    })
  }

  // Note: This function overrides a function on the BaseTrie
  // Overridden only to allow async/await, for sanity.
  async findPath(key:LargeNumber, callback?:FindPathCallback):Promise<FindPathObject> {
    if (callback) {
      super.findPath(key, callback);
    }
    
    return new Promise((resolve, reject) => {
      super.findPath(key, (err: Error, node: TrieNode, keyRemainder: Buffer, stack: TrieNode[]) => {
        if (err) return reject(err);
        return resolve({
          node,
          keyRemainder,
          stack
        })
      })
    })
  }

  // Note: This function overrides a function on the BaseTrie
  // Overridden only to allow async/await, for sanity.
  async put(key:LargeNumber, value:LargeNumber, callback?:Callback<never>):Promise<void> {
    if (callback) {
      super.put(key, value, callback);
    }

    return new Promise((resolve, reject) => {
      super.put(key, value, (err:Error) => {
        if (err) {
          return reject(err);
        }
        resolve();
      })
    }) 
  }

  // Note: This function overrides a function on the BaseTrie
  // Overridden only to allow async/await, for sanity.
  async del(key:LargeNumber, callback?:Callback<never>):Promise<void> {
    if (callback) {
      super.del(key, callback);
    }

    return new Promise((resolve, reject) => {
      super.del(key, (err:Error) => {
        if (err) {
          return reject(err);
        }
        resolve();
      })
    }) 
  }
}
