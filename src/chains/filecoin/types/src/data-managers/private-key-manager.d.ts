/// <reference types="node" />
import { LevelUp } from "levelup";
export default class PrivateKeyManager {
  static AccountsWithPrivateKeysKey: Buffer;
  private base;
  static initialize(base: LevelUp): Promise<PrivateKeyManager>;
  constructor(base: LevelUp);
  getPrivateKey(address: string): Promise<string | null>;
  putPrivateKey(address: string, privateKey: string): Promise<void>;
  getAddressesWithPrivateKeys(): Promise<Array<string>>;
  hasPrivateKey(address: string): Promise<boolean>;
  deletePrivateKey(address: string): Promise<void>;
  setDefault(address: string): Promise<void>;
}
