import { LevelUp } from "levelup";

const NOTFOUND = 404;

export default class PrivateKeyManager {
  static AccountsWithPrivateKeysKey = Buffer.from("accounts-with-private-keys");
  private base: LevelUp;
  #addressesWithPrivateKeys: string[];

  get addressesWithPrivateKeys() {
    return this.#addressesWithPrivateKeys;
  }

  static async initialize(base: LevelUp) {
    let addressesWithPrivateKeys: string[];
    try {
      const result: Buffer = await base.get(
        PrivateKeyManager.AccountsWithPrivateKeysKey
      );
      addressesWithPrivateKeys = JSON.parse(result.toString());
    } catch (e: any) {
      if (e.status === NOTFOUND) {
        // if the array doesn't exist yet, initialize it
        addressesWithPrivateKeys = [];
        await base.put(
          PrivateKeyManager.AccountsWithPrivateKeysKey,
          Buffer.from(JSON.stringify(addressesWithPrivateKeys))
        );
      } else {
        throw e;
      }
    }

    const manager = new PrivateKeyManager(base, addressesWithPrivateKeys);

    return manager;
  }

  constructor(base: LevelUp, addressesWithPrivateKeys: string[]) {
    this.base = base;
    this.#addressesWithPrivateKeys = addressesWithPrivateKeys;
  }

  async getPrivateKey(address: string): Promise<string | null> {
    address = address.toLowerCase();
    try {
      const privateKey: Buffer = await this.base.get(Buffer.from(address));
      return privateKey.toString("hex");
    } catch (e: any) {
      if (e.status === NOTFOUND) {
        return null;
      }
      throw e;
    }
  }

  /**
   * NOTE: This function should only be called from
   * `AccountManager.putAccount` to ensure fields are written
   * atomically. Only call this function if you know what you're doing.
   */
  putPrivateKey(address: string, privateKey: string) {
    address = address.toLowerCase();
    this.base.put(Buffer.from(address), Buffer.from(privateKey, "hex"));

    if (!this.#addressesWithPrivateKeys.includes(address)) {
      this.#addressesWithPrivateKeys.push(address);

      // TODO(perf): (Issue ganache#875) If the number of private
      // keys becomes very large (a highly unlikely event), this would
      // kill performance whenever accounts were created
      this.base.put(
        PrivateKeyManager.AccountsWithPrivateKeysKey,
        Buffer.from(JSON.stringify(this.#addressesWithPrivateKeys))
      );
    }
  }

  async hasPrivateKey(address: string) {
    address = address.toLowerCase();
    return this.#addressesWithPrivateKeys.includes(address);
  }

  async deletePrivateKey(address: string) {
    address = address.toLowerCase();
    if (this.#addressesWithPrivateKeys.includes(address)) {
      this.#addressesWithPrivateKeys = this.#addressesWithPrivateKeys.filter(
        a => a !== address
      );
      this.base.del(Buffer.from(address));

      // TODO(perf): (Issue ganache#875) If the number of private
      // keys becomes very large (a highly unlikely event), this would
      // kill performance whenever accounts were created
      await this.base.put(
        PrivateKeyManager.AccountsWithPrivateKeysKey,
        Buffer.from(JSON.stringify(this.#addressesWithPrivateKeys))
      );
    }
  }

  async setDefault(address: string) {
    address = address.toLowerCase();
    if (await this.hasPrivateKey(address)) {
      this.#addressesWithPrivateKeys = this.#addressesWithPrivateKeys.filter(
        a => a !== address
      );
      this.#addressesWithPrivateKeys.unshift(address);

      // TODO(perf): (Issue ganache#875) If the number of private
      // keys becomes very large (a highly unlikely event), this would
      // kill performance whenever accounts were created
      await this.base.put(
        PrivateKeyManager.AccountsWithPrivateKeysKey,
        Buffer.from(JSON.stringify(this.#addressesWithPrivateKeys))
      );
    } else {
      throw new Error(
        `Cannot set ${address} as the default address as it's not part of the wallet.`
      );
    }
  }
}
