import {LargeNumber, Callback } from "merkle-patricia-tree/baseTrie";
import checkpointInterface from "merkle-patricia-tree/checkpoint-interface";
import { LevelUp } from "levelup";
import { GenericProvider } from "@ganache/options";
import Blockchain from "../blockchain";
import { BN, rlp } from "ethereumjs-util";
import { Quantity, Data } from "@ganache/utils";
import Account from "ethereumjs-account";
import { fetchAccountFromOriginalChain } from "./helpers";
import PromisifiedBaseTrie, { FindPathObject } from "./promisifiedbasetrie";
const sub = require("subleveldown");

export type ForkedStorageTrieOptions = {
  blockchain:Blockchain;
  originalProvider:GenericProvider;
  forkBlockNumber?:number;
}

export type ForkedStorageAccountTrieOptions = ForkedStorageTrieOptions & {
  address:string;
}

// Heads up: This is abstract. See below. 
abstract class ForkedTrie extends PromisifiedBaseTrie {
  protected db:LevelUp;
  protected options:ForkedStorageTrieOptions;
  protected blockchain:Blockchain;
  protected originalProvider:GenericProvider;
  protected forkBlockNumber:number;
  protected deleted:LevelUp;

  constructor(db:LevelUp, root:Buffer, options:ForkedStorageTrieOptions) {
    super(db, root);
    this.db = db;
    this.options = options;
    this.blockchain = options.blockchain;
    this.originalProvider = options.originalProvider;
    this.forkBlockNumber = options.forkBlockNumber;
    this.deleted = sub(db, "deleted", {valueEncoding: "binary"});
  }

  // TODO: Move elsewhere
  protected toBuffer(val:LargeNumber):Buffer {
    // TODO: I have no idea why Typescript wants the right hand side
    // of this express to be `any`. But it does.
    if (val instanceof (BN as any)) {
      return (val as BN).toBuffer();
    } else {
      return Buffer.from(val);
    }
  }

  // These overrides give us the Typescript equivalent of the previous version of this function.
  // It'll override `get()` from BaseTrie, add the extra positional `blockNumber`
  // parameter, and support async/await for our sanity. 
  // Note: This function overrides a function on the BaseTrie
  async get(key:LargeNumber):Promise<Buffer>;
  async get(key:LargeNumber, blockNumber?:number):Promise<Buffer>;
  async get(key:LargeNumber, cb:Callback<Buffer>):Promise<void>;
  async get(key:LargeNumber, callbackOrBlockNumber?:Callback<Buffer>|number, cb?:Callback<Buffer>):Promise<Buffer|void> {
    let blockNumber:number;

    if (typeof callbackOrBlockNumber == "function") {
      cb = callbackOrBlockNumber; 
      blockNumber = undefined;
    } else {
      blockNumber = callbackOrBlockNumber;
    }

    // Shim to allow both callback and promisified usage, without 
    // completely restructuring this function as written.
    let callback = (err:Error, result?:Buffer):void|Promise<Buffer> => {
      if (cb) {
        return cb(err, result);
      }
      return new Promise((resolve, reject) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      })
    }

    key = this.toBuffer(key);

    const exists = await this.keyExists(key);

    if (exists) {
      // Block number not provided. Get the key as normal. 
      return callback(null, await this.getFromExistingStorage(key, blockNumber));
    } 

    // So it doesn't exist. If we wasn't explicitly deleted
    // let's fetch it as an account from the original chain.
    let deleted = await this.keyIsDeleted(key);

    if (deleted) {
      // it was deleted. return nothing.
      return callback(null, Buffer.allocUnsafe(0));
    } 

    // Not deleted? Get the the data from original chain
    return callback(null, await this.getFromOriginalChain(key, blockNumber));
  }

  // Note: This function overrides a function on the BaseTrie
  async put(key:LargeNumber, value:LargeNumber, cb?:Callback<never>):Promise<void> {
    let deletionKey = this.getDeletionKey(this.toBuffer(key));
    let deleted = await this.deleted.get(deletionKey);

    if (deleted === 1) {
      await this.deleted.put(deletionKey, 0);
    } 

    return super.put(key, value, cb);
  }

  // Note: This function overrides a function on the BaseTrie
  async del(key:LargeNumber, cb?:Callback<never>):Promise<void> {
    let deletionKey = this.getDeletionKey(this.toBuffer(key));
    await this.deleted.put(deletionKey, 1);
    return super.del(key, cb);
  }

  copy():ForkedTrie {
    return new (this as any).constructor(this.db, super.root, this.options);
  }

  copyAsAccountTrie(address:string) {
    return new ForkedAccountTrie(this.db, super.root, Object.assign(
      {
        address
      }, 
      this.options
    ));
  }

  
  async keyExists(key:Buffer):Promise<boolean> {
    let path:FindPathObject = await this.findPath(key);
    return path.node && path.keyRemainder.length === 0;
  }

  async keyIsDeleted(key:Buffer):Promise<boolean> {
    let deletionKey = this.getDeletionKey(key);
    return await this.deleted.get(deletionKey) === 1;
  }

  // The following protected functions are overridden by extending
  // classes to define the behavior of this trie. 
  protected abstract async getFromExistingStorage(key:Buffer, blockNumber?:number):Promise<Buffer>;
  protected abstract async getFromOriginalChain(key:Buffer, blockNumber?:number):Promise<Buffer>;
  protected abstract getDeletionKey(key:Buffer):string;
}

export class ForkedAccountTrie extends ForkedTrie {
  #address:string;

  constructor(db:LevelUp, root:Buffer, options:ForkedStorageAccountTrieOptions) {
    super(db, root, options);
    this.#address = options.address;
  }

  protected async getFromExistingStorage(key:Buffer, blockNumber?:number):Promise<Buffer> {
    // I'm checking to see if a blockNumber is explictly provided because the below
    // logic breaks for things like nonce lookup, in which we should just
    // use the root trie as is. I'm guessing there's a cleaner architecture
    // that doesn't require such checks
    if (typeof blockNumber != "undefined") {
      let block = await this.blockchain.blocks.get(Quantity.from(blockNumber).toBuffer());
      let accountData = await this.getAtStateRoot(this.#address, block.value.header.stateRoot);
      let value = await this.getAtStateRoot(key, new Account(accountData).stateRoot);
      return value;
    }

    // Block number not provided. Get the key as normal. 
    return super.get(key);
  }

  // If we need to pull a key from the original chain, we're always pulling it
  // in relation to the account's storage. We use eth_getStorageAt to do that for us.
  protected async getFromOriginalChain(key:Buffer, blockNumber?:number):Promise<Buffer> {
    if (!blockNumber) {
      blockNumber = this.forkBlockNumber;
    }

    if (blockNumber > this.forkBlockNumber) {
      blockNumber = this.forkBlockNumber;
    }

    let value = await this.originalProvider.send("eth_getStorageAt", [
      this.#address,
      Data.from(key).toString(),
      blockNumber 
    ])

    return rlp.encode(value);
  }

  /*
   * Get the data from a key at a specified state root.
   */ 
  async getAtStateRoot(key:LargeNumber, newRoot:Buffer):Promise<Buffer> {
    const currentStateRoot = this.root;
    this.root = newRoot;

    let value:Buffer;
    let error:Error;

    try {
      value = await super.get(key);
    } catch (err) {
      error = err;
    }

    // Make sure the state root gets put back regardless of error
    this.root = currentStateRoot;

    // Now continue as normal
    if (error) {
      throw error;
    }

    return value;
  }

  getDeletionKey(key:Buffer):string {
    return `${Data.from(this.#address).toString()};${Data.from(key).toString()}`;
  }
}


export class ForkedStorageTrie extends ForkedTrie {
  constructor(db:LevelUp, root:Buffer, options:ForkedStorageTrieOptions) {
    super(db, root, options);
    checkpointInterface(this);
  }

  // The following protected functions are overrided by the 
  // AccountTrie to change the behavior for tries that manage account data.
  protected async getFromExistingStorage(key:Buffer, blockNumber?:number):Promise<Buffer> {
    return super.get(key);
  }

  protected async getFromOriginalChain(key:Buffer, blockNumber?:number):Promise<Buffer> {
    let account = await fetchAccountFromOriginalChain(key, this, blockNumber, this.forkBlockNumber, this.originalProvider);
    return account.serialize() ;
  }

  protected getDeletionKey(key:Buffer):string {
    return Data.from(key).toString();
  }
}

// TODO: Determine if we need this.
// ForkedStorageTrie.prove = MerklePatriciaTree.prove;
// ForkedStorageTrie.verifyProof = MerklePatriciaTree.verifyProof;