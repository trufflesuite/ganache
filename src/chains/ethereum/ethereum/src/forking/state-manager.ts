import { Address as EJS_Address } from "ethereumjs-util";
import { decode } from "rlp";
import StateManager from "@ethereumjs/vm/dist/state/stateManager";
import AccountManager from "../data-managers/account-manager";
import { ForkCache } from "./cache";
import Common from "@ethereumjs/common";
import { ForkTrie } from "./trie";
import { SecureTrie as Trie } from "merkle-patricia-tree";

/**
 * Options for constructing a [[StateManager]].
 */
export interface DefaultStateManagerOpts {
  /**
   * Parameters of the chain ([`Common`](https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/common))
   */
  common: Common;
  /**
   * An [`merkle-patricia-tree`](https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/trie) instance
   */
  trie: ForkTrie;
}

/**
 * Interface for getting and setting data from an underlying
 * state trie.
 */
export class ForkStateManager extends StateManager {
  _cache: ForkCache;
  private accounts: AccountManager;

  /**
   * Instantiate the StateManager interface.
   */
  constructor(opts: DefaultStateManagerOpts, accounts: AccountManager) {
    super(opts);

    this.accounts = accounts;
    this._cache = new ForkCache(opts.trie, accounts);
  }

  /**
   * Copies the current instance of the `StateManager`
   * at the last fully committed point, i.e. as if all current
   * checkpoints were reverted.
   */
  copy(): StateManager {
    return new ForkStateManager(
      {
        trie: this._trie.copy(false) as ForkTrie,
        common: this._common
      },
      this.accounts
    );
  }

  /**
   * Creates a storage trie from the primary storage trie
   * for an account and saves this in the storage cache.
   * @private
   */
  async _lookupStorageTrie(address: EJS_Address) {
    // from state trie
    const account = await this.getAccount(address);
    const storageTrie = this._trie.copy(false) as ForkTrie;
    storageTrie.setContext(account.stateRoot, address.buf);
    storageTrie.db.checkpoints = [];
    return storageTrie;
  }

  /**
   * Gets the storage value associated with the provided `address` and `key`. This method returns
   * the shortest representation of the stored value.
   * @param address -  Address of the account to get the storage for
   * @param key - Key in the account's storage to get the value for. Must be 32 bytes long.
   * @returns {Promise<Buffer>} - The storage value for the account
   * corresponding to the provided address at the provided key.
   * If this does not exist an empty `Buffer` is returned.
   */
  async getContractStorage(address: EJS_Address, key: Buffer): Promise<Buffer> {
    if (key.length !== 32) {
      throw new Error("Storage key must be 32 bytes long");
    }

    const trie = (await this._getStorageTrie(address)) as ForkTrie;
    (trie as any).address = address.buf;
    const value = await trie.get(key);

    const decoded = decode(value);
    return decoded as Buffer;
  }

  /**
   * Modifies the storage trie of an account.
   * @private
   * @param address -  Address of the account whose storage is to be modified
   * @param modifyTrie - Function to modify the storage trie of the account
   */
  // async _modifyContractStorage(
  //   address: EJS_Address,
  //   modifyTrie: (storageTrie: Trie, done: Function) => void
  // ) {
  //   // eslint-disable-next-line no-async-promise-executor
  //   return new Promise<void>(async resolve => {
  //     const storageTrie = await this._getStorageTrie(address);
  //     modifyTrie(storageTrie, async () => {
  //       // update storage cache
  //       const addressHex = address.buf.toString("hex");
  //       (storageTrie as any).address = address.buf;
  //       this._storageTries[addressHex] = storageTrie;
  //       // update contract stateRoot
  //       const contract = this._cache.get(address);
  //       contract.stateRoot = storageTrie.root;
  //       await this.putAccount(address, contract);
  //       this.touchAccount(address);
  //       resolve();
  //     });
  //   });
  // }
}
