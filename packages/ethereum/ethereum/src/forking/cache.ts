import { Account, Address } from "@ethereumjs/util";
import { Cache } from "@ethereumjs/statemanager/dist/cjs/cache/cache";
import { GanacheTrie } from "../helpers/trie";
import { ForkTrie } from "./trie";
import { CacheType, StorageCache } from "@ethereumjs/statemanager";

// TODO: we now need two caches, one for accounts and one for Storage.

export class ForkCache extends StorageCache {
  constructor(trie: GanacheTrie) {
    /**
     * Looks up address in underlying trie.
     * @param address - Address of account
     */
    const lookupAccount = async (address: Address) => {
      const rlp = await (trie as ForkTrie).get(Buffer.from(address.bytes));
      return rlp ? Account.fromRlpSerializedAccount(rlp) : new Account();
    };
    // super({
    //   getCb: lookupAccount,
    //   putCb: trie.put.bind(trie),
    //   deleteCb: trie.del.bind(trie)
    // });
    super({ type: CacheType.LRU, size: 1000 });
    //this.get = lookupAccount;
  }
}
