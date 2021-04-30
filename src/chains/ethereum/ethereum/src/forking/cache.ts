import { Account, Address as EJS_Address } from "ethereumjs-util";
import Cache from "@ethereumjs/vm/dist/state/cache";
import { GanacheTrie } from "../helpers/trie";
import { ForkTrie } from "./trie";

export class ForkCache extends Cache {
  constructor(trie: GanacheTrie) {
    super(trie);
  }

  /**
   * Looks up address in underlying trie.
   * @param address - Address of account
   */
  _lookupAccount = async (address: EJS_Address) => {
    const rlp = await (this._trie as ForkTrie).get(address.buf);
    return Account.fromRlpSerializedAccount(rlp!);
  };
}
