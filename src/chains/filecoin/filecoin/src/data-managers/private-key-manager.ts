import { LevelUp } from "levelup";

const NOTFOUND = 404;

export default class PrivateKeyManager {
  static AccountsWithPrivateKeysKey = Buffer.from("accounts-with-private-keys");
  private base: LevelUp;

  static async initialize(base: LevelUp) {
    const manager = new PrivateKeyManager(base);
    return manager;
  }

  constructor(base: LevelUp) {
    this.base = base;
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

  async putPrivateKey(address: string, privateKey: string) {
    await this.base.put(Buffer.from(address), Buffer.from(privateKey));
    const addresses = await this.getAddressesWithPrivateKeys();
    if (!addresses.includes(address)) {
      addresses.push(address);
      await this.base.put(
        PrivateKeyManager.AccountsWithPrivateKeysKey,
        Buffer.from(JSON.stringify(addresses))
      );
    }
  }

  async getAddressesWithPrivateKeys(): Promise<Array<string>> {
    try {
      const result: Buffer = await this.base.get(
        PrivateKeyManager.AccountsWithPrivateKeysKey
      );
      return JSON.parse(result.toString());
    } catch (e) {
      if (e.status === NOTFOUND) {
        await this.base.put(
          PrivateKeyManager.AccountsWithPrivateKeysKey,
          Buffer.from(JSON.stringify([]))
        );
        return [];
      }
      throw e;
    }
  }
}
