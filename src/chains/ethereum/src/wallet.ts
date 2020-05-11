import {Data} from "@ganache/utils/src/things/json-rpc";
import Address from "./things/address";
import EthereumOptions from "./options";
import Account from "./things/account";
import {toChecksumAddress} from "ethereumjs-util";

export default class Wallet {
  readonly accounts: Address[];
  readonly knownAccounts = new Map<string, Data>();
  readonly unlockedAccounts = new Set<string>();
  readonly coinbase: Account;

  constructor(opts: EthereumOptions) {
    const accounts = opts.accounts;
    const knownAccounts = this.knownAccounts;
    const unlockedAccounts = this.unlockedAccounts;

    //#region Configure Known and Unlocked Accounts
    this.coinbase = accounts[0];
    const l = accounts.length;
    const accountsCache = (this.accounts = Array(l));
    for (let i = 0; i < l; i++) {
      const account = accounts[i];
      const address = account.address;
      const strAddress = address.toString();
      accountsCache[i] = toChecksumAddress(strAddress);
      knownAccounts.set(strAddress, account.privateKey);

      // if the `secure` option has been set do NOT add these accounts to the
      // _unlockedAccounts
      if (opts.secure) continue;

      unlockedAccounts.add(strAddress);
    }
    //#endregion

    //#region Unlocked Accounts
    const givenUnlockedUaccounts = opts.unlocked_accounts;
    if (givenUnlockedUaccounts) {
      const ul = givenUnlockedUaccounts.length;
      for (let i = 0; i < ul; i++) {
        let arg = givenUnlockedUaccounts[i];
        let address;
        switch (typeof arg) {
          case "string":
            // `toLowerCase` so we handle uppercase `0X` formats
            const addressOrIndex = arg.toLowerCase();
            if (addressOrIndex.indexOf("0x") === 0) {
              address = addressOrIndex;
              break;
            } else {
              // try to convert the arg string to a number.
              // don't use parseInt because strings like `"123abc"` parse
              // to `123`, and there is probably an error on the user's side we'd
              // want to uncover.
              const index = (arg as any) - 0;
              // if we don't have a valid number, or the number isn't an valid JS
              // integer (no bigints or decimals, please), throw an error.
              if (!Number.isSafeInteger(index)) {
                throw new Error(`Invalid value in unlocked_accounts: ${arg}`);
              }
              arg = index;
              // not `break`ing here because I want this to fall through to the
              //  `"number"` case below.
              // Refactor it if you want.
              // break; // no break, please.
            }
          case "number":
            const account = accounts[arg];
            if (account == null) {
              throw new Error(`Account at index ${arg} not found. Max index available is ${l - 1}.`);
            }
            address = account.address.toString().toLowerCase();
            break;
          default:
            throw new Error(`Invalid value specified in unlocked_accounts`);
        }
        unlockedAccounts.add(address);
      }
    }
    //#endregion
  }
}
