import { Address as EJS_Address } from "@ethereumjs/util";
import { decode } from "@ganache/rlp";
import { DefaultStateManager as StateManager } from "@ethereumjs/statemanager";
import AccountManager from "../data-managers/account-manager";
import { ForkCache } from "./cache";
import { ForkTrie } from "./trie";

/**
 * Options for constructing a [[StateManager]].
 */
export interface DefaultStateManagerOpts {
  /**
   * An [`@ethereumjs/trie`](https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/trie) instance
   */
  trie: ForkTrie;
  /**
   * Enables code hash prefixing, which is used by `ethereumjs/statemanager` to
   * [distinguish between a contract deployed with code `0x80` and
   * `RLP([])`](https://github.com/ethereumjs/ethereumjs-monorepo/blob/master/packages/statemanager/src/stateManager.ts#L40)
   */
  prefixCodeHashes?: boolean;
}

/**
 * Interface for getting and setting data from an underlying
 * state trie.
 */
export class ForkStateManager extends StateManager {
  _cache: ForkCache;

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
      trie: this._trie.copy(false) as ForkTrie
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
      account.storageRoot,
      address.buf,
      storageTrie.blockNumber
    );
    // we copy checkpoints over only for the metadata checkpoints, not the trie
    // checkpoints.
    storageTrie.database().checkpoints = [];
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
    return decode<Buffer>(value);
  }
}
