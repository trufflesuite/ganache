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
    address = address.toLowerCase();
    try {
      const privateKey: Buffer = await this.base.get(Buffer.from(address));
      return privateKey.toString("hex");
    } catch (e) {
      if (e.status === NOTFOUND) {
        return null;
      }
      throw e;
    }
  }

  async putPrivateKey(address: string, privateKey: string) {
    address = address.toLowerCase();
    await this.base.put(Buffer.from(address), Buffer.from(privateKey, "hex"));
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

  async hasPrivateKey(address: string) {
    address = address.toLowerCase();
    const addresses = await this.getAddressesWithPrivateKeys();
    return addresses.includes(address);
  }

  async deletePrivateKey(address: string) {
    address = address.toLowerCase();
    let addresses = await this.getAddressesWithPrivateKeys();
    if (addresses.includes(address)) {
      addresses = addresses.filter(a => a !== address);
      this.base.del(Buffer.from(address));
      await this.base.put(
        PrivateKeyManager.AccountsWithPrivateKeysKey,
        Buffer.from(JSON.stringify(addresses))
      );
    }
  }

  async setDefault(address: string) {
    address = address.toLowerCase();
    if (this.hasPrivateKey(address)) {
      let addresses = await this.getAddressesWithPrivateKeys();
      addresses = addresses.filter(a => a !== address);
      addresses.unshift(address);
      await this.base.put(
        PrivateKeyManager.AccountsWithPrivateKeysKey,
        Buffer.from(JSON.stringify(addresses))
      );
    } else {
      throw new Error(
        `Cannot set ${address} as the default address as it's not part of the wallet.`
      );
    }
  }
}
