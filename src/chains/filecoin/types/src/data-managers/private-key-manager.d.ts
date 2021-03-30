/// <reference types="node" />
import { LevelUp } from "levelup";
export default class PrivateKeyManager {
  #private;
  static AccountsWithPrivateKeysKey: Buffer;
  private base;
  get addressesWithPrivateKeys(): string[];
  static initialize(base: LevelUp): Promise<PrivateKeyManager>;
  constructor(base: LevelUp, addressesWithPrivateKeys: string[]);
  getPrivateKey(address: string): Promise<string | null>;
  /**
   * NOTE: This function should only be called from
   * `AccountManager.putAccount` to ensure fields are written
   * atomically. Only call this function if you know what you're doing.
   */
  putPrivateKey(address: string, privateKey: string): void;
  hasPrivateKey(address: string): Promise<boolean>;
  deletePrivateKey(address: string): Promise<void>;
  setDefault(address: string): Promise<void>;
}
