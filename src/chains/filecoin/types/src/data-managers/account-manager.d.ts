import Manager from "./manager";
import { LevelUp } from "levelup";
import { Account, AccountConfig } from "../things/account";
import PrivateKeyManager from "./private-key-manager";
export default class AccountManager extends Manager<Account, AccountConfig> {
  #private;
  static initialize(
    base: LevelUp,
    privateKeyManager: PrivateKeyManager
  ): Promise<AccountManager>;
  constructor(base: LevelUp, privateKeyManager: PrivateKeyManager);
  putAccount(account: Account): Promise<void>;
  getAccount(address: string): Promise<Account>;
  /**
   * Returns an array of accounts which we have private keys
   * for. The order is the order in which they were stored.
   * To add a controllable account, use `AccountManager.putAccount(account)`
   * where `account.address.privateKey` is set.
   */
  getControllableAccounts(): Promise<Array<Account>>;
  mintFunds(address: string, amount: bigint): Promise<void>;
  transferFunds(from: string, to: string, amount: bigint): Promise<boolean>;
  incrementNonce(address: string): Promise<void>;
}
