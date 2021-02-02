import Manager from "./manager";
import { LevelUp } from "levelup";
import { Account, AccountConfig } from "../things/account";
import PrivateKeyManager from "./private-key-manager";

export default class AccountManager extends Manager<Account, AccountConfig> {
  #privateKeyManager: PrivateKeyManager;

  static async initialize(base: LevelUp, privateKeyManager: PrivateKeyManager) {
    const manager = new AccountManager(base, privateKeyManager);
    return manager;
  }

  constructor(base: LevelUp, privateKeyManager: PrivateKeyManager) {
    super(base, Account);

    // the account manager doesn't handle private keys directly
    // we need to use the private key manager for that
    this.#privateKeyManager = privateKeyManager;
  }

  async putAccount(account: Account) {
    await super.set(account.address.value, account);

    if (account.address.privateKey) {
      await this.#privateKeyManager.putPrivateKey(
        account.address.value,
        account.address.privateKey
      );
    }
  }

  async getAccount(address: string): Promise<Account> {
    let account = await super.get(address);
    if (!account) {
      account = new Account({
        address: new Address(address)
      });
      await this.putAccount(account);
    }

    const privateKey = await this.#privateKeyManager.getPrivateKey(
      account.address.value
    );
    if (privateKey) {
      account.address.setPrivateKey(privateKey);
    }

    return account;
  }

  /**
   * Returns an array of accounts which we have private keys
   * for. The order is the order in which they were stored.
   * To add a controllable account, use `AccountManager.putAccount(account)`
   * where `account.address.privateKey` is set.
   */
  async getControllableAccounts(): Promise<Array<Account>> {
    const addresses = await this.#privateKeyManager.getAddressesWithPrivateKeys();
    const accounts = await Promise.all(
      addresses.map(async address => await this.getAccount(address))
    );
    return accounts;
  }

  async mintFunds(address: string, amount: bigint) {
    const account = await this.getAccount(address);
    account.addBalance(amount);
    await this.putAccount(account);
  }

  async transferFunds(
    from: string,
    to: string,
    amount: bigint
  ): Promise<boolean> {
    const fromAccount = await this.getAccount(from);
    const toAccount = await this.getAccount(to);
    if (fromAccount.balance.value >= amount) {
      fromAccount.subtractBalance(amount);
      toAccount.addBalance(amount);
      await this.putAccount(fromAccount);
      await this.putAccount(toAccount);
      return true;
    } else {
      return false;
    }
  }

  async incrementNonce(address: string) {
    const account = await this.getAccount(address);
    account.nonce++;
    await this.putAccount(account);
  }
}
