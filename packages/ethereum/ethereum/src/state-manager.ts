import {
  DefaultStateManager,
  DefaultStateManagerOpts
} from "@ethereumjs/statemanager";
import { Trie } from "@ethereumjs/trie";
import { KECCAK256_RLP } from "@ethereumjs/util";

export class GanacheStateManager extends DefaultStateManager {
  async getStorageTrie(address: Buffer): Promise<Trie> {
    return await (this as any)._getStorageTrie(
      {
        bytes: address
      },
      {
        storageRoot: KECCAK256_RLP
      }
    );
  }
}
