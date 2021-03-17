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
    } catch (e) {
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
    try {
      const privateKey: Buffer = await this.base.get(Buffer.from(address));
      return privateKey.toString();
    } catch (e) {
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
    this.base.put(Buffer.from(address), Buffer.from(privateKey));

    if (!this.#addressesWithPrivateKeys.includes(address)) {
      this.#addressesWithPrivateKeys.push(address);

      // TODO(perf): (Issue ganache-core#875) If the number of private
      // keys becomes very large (a highly unlikely event), this would
      // kill performance whenever accounts were created
      this.base.put(
        PrivateKeyManager.AccountsWithPrivateKeysKey,
        Buffer.from(JSON.stringify(this.#addressesWithPrivateKeys))
      );
    }
  }
}
