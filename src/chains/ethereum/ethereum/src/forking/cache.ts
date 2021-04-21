import { Account, Address as EJS_Address } from "ethereumjs-util";
import Cache from "@ethereumjs/vm/dist/state/cache";
import AccountManager from "../data-managers/account-manager";
import { Address } from "@ganache/ethereum-address";
import { GanacheTrie } from "../helpers/trie";
import { Tag } from "@ganache/ethereum-utils";

export class ForkCache extends Cache {
  private accounts: AccountManager;
  constructor(trie: GanacheTrie, accounts: AccountManager) {
    super(trie);
    this.accounts = accounts;
  }

  /**
   * Looks up address in underlying trie.
   * @param address - Address of account
   */
  _lookupAccount = async (address: EJS_Address) => {
    const rlp = await this._trie.get(address.buf);
    if (rlp) {
      return Account.fromRlpSerializedAccount(rlp);
    } else {
      const rlp = await this.accounts.getRaw(
        Address.from(address.buf),
        Tag.LATEST
      );
      return rlp ? Account.fromRlpSerializedAccount(rlp) : new Account();
    }
  };
}
