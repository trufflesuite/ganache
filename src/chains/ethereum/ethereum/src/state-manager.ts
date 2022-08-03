import SM from "@ethereumjs/vm/dist/state/stateManager";
import { SecureTrie as Trie } from "merkle-patricia-tree";

export class GanacheStateManager extends SM {
  async getStorageTrie(address: Buffer): Promise<Trie> {
    return await this._getStorageTrie({ buf: address } as any);
  }
}
