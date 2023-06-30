import { DefaultStateManager } from "@ethereumjs/statemanager";
import { Trie } from "@ethereumjs/trie";

export class GanacheStateManager extends DefaultStateManager {
  async getStorageTrie(address: Buffer): Promise<Trie> {
    return await this._getStorageTrie({ buf: address } as any);
  }
}
