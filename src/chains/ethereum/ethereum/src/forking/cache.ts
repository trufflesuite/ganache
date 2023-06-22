import { Account, Address } from "@ethereumjs/util";
import { Cache } from "@ethereumjs/statemanager/dist/cache";
import { GanacheTrie } from "../helpers/trie";
import { ForkTrie } from "./trie";

export class ForkCache extends Cache {
  constructor(trie: GanacheTrie) {
    /**
     * Looks up address in underlying trie.
     * @param address - Address of account
     */
    const lookupAccount: (
      address: Address
    ) => Promise<Account | undefined> = async (address: Address) => {
      const rlp = await (trie as ForkTrie).get(address.buf);
      return rlp ? Account.fromRlpSerializedAccount(rlp) : undefined;
    };
    super({
      getCb: lookupAccount,
      putCb: trie.put.bind(trie),
      deleteCb: trie.del.bind(trie)
    });
  }
}
