import { Address as EJS_Address } from "ethereumjs-util";
import { decode } from "rlp";
import StateManager from "@ethereumjs/vm/dist/state/stateManager";
import AccountManager from "../data-managers/account-manager";
import { ForkCache } from "./cache";
import Common from "@ethereumjs/common";
import { ForkTrie } from "./trie";

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
  constructor(opts: DefaultStateManagerOpts) {
    super(opts);

    this._cache = new ForkCache(opts.trie);
  }

  /**
   * Copies the current instance of the `StateManager`
   * at the last fully committed point, i.e. as if all current
   * checkpoints were reverted.
   */
  copy(): StateManager {
    return new ForkStateManager({
      trie: this._trie.copy(false) as ForkTrie,
      common: this._common
    });
  }

  /**
   * Creates a storage trie from the primary storage trie
   * for an account and saves this in the storage cache.
   * @private
   */
  async _lookupStorageTrie(address: EJS_Address) {
    // from state trie
    const account = await this.getAccount(address);
    const storageTrie = this._trie.copy(true) as ForkTrie;
    storageTrie.setContext(
      account.stateRoot,
      address.buf,
      storageTrie.blockNumber
    );
    // we copy checkpoints over only for the metadata checkpoints, not the trie
    // checkpoints.
    storageTrie.db.checkpoints = [];
    return storageTrie;
  }

  /**
   * Gets the storage value associated with the provided `address` and `key`.
   * This method returns the shortest representation of the stored value.
   * @param address - Address of the account to get the storage for
   * @param key - Key in the account's storage to get the value for. Must be 32
   * bytes long.
   * @returns {Promise<Buffer>} - The storage value for the account
   * corresponding to the provided address at the provided key. If this does not
   * exist an empty `Buffer` is returned.
   */
  async getContractStorage(address: EJS_Address, key: Buffer): Promise<Buffer> {
    const trie = (await this._getStorageTrie(address)) as ForkTrie;
    const value = await trie.get(key);
    return decode(value);
  }
}
