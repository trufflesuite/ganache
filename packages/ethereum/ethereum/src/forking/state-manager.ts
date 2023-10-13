import { Trie } from "@ethereumjs/trie";
import { Account, Address as EJS_Address } from "@ethereumjs/util";
import { decode } from "@ganache/rlp";
import { ForkTrie } from "./trie";
import { GanacheStateManager } from "../state-manager";

/**
 * Options for constructing a [[GanacheStateManager]].
 */
export interface ForkStateManagerOpts {
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
export class ForkStateManager extends GanacheStateManager {
  // declare _cache: ForkCache;
  readonly prefixCodeHashes: boolean;

  /**
   * Instantiate the StateManager interface.
   */
  constructor(opts: ForkStateManagerOpts) {
    super(opts);

    // this._cache = new ForkCache(opts.trie);
    this.prefixCodeHashes = opts.prefixCodeHashes || false;
  }

  /**
   * Copies the current instance of the `StateManager`
   * at the last fully committed point, i.e. as if all current
   * checkpoints were reverted.
   */
  shallowCopy(): ForkStateManager {
    return new ForkStateManager({
      trie: this._trie.shallowCopy(false) as ForkTrie,
      prefixCodeHashes: this.prefixCodeHashes
    });
  }

  protected async _getStorageTrie(
    address: EJS_Address,
    account: Account
  ): Promise<Trie> {
    // from storage cache
    const addressHex = Buffer.from(address.bytes).toString("hex");
    const storageTrie = this._storageTries[addressHex];
    if (storageTrie === undefined) {
      const storageTrie = this._trie.shallowCopy(false) as ForkTrie;
      storageTrie.setContext(
        Buffer.from(account.storageRoot),
        Buffer.from(address.bytes),
        storageTrie.blockNumber
      );
      // we copy checkpoints over only for the metadata checkpoints, not the trie
      // checkpoints.
      storageTrie.database().checkpoints = [];

      this._storageTries[addressHex] = storageTrie;

      return storageTrie;
    }
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
  async getContractStorage(
    address: EJS_Address,
    key: Uint8Array
  ): Promise<Uint8Array> {
    const account = await this.getAccount(address);
    const trie = (await this._getStorageTrie(address, account)) as ForkTrie;
    const value = await trie.get(key);
    if (value) {
      const bufferValue = Buffer.from(value);
      const buf = decode<Buffer>(bufferValue);
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    } else {
      return new Uint8Array(0);
    }
  }
}
