import { DefaultStateManager } from "@ethereumjs/statemanager";
import { Trie } from "@ethereumjs/trie";

export class GanacheStateManager extends DefaultStateManager {
  async getStorageTrie(
    address: Buffer,
    storageRoot: Uint8Array
  ): Promise<Trie> {
    return await super._getStorageTrie(
      {
        bytes: address
      } as any,
      {
        storageRoot
      } as any
    );
  }
}
