import SM from "@ethereumjs/vm/dist/state/stateManager";

export class StateManager extends SM {
  /**
   * Removes accounts form the state trie that have been touched,
   * as defined in EIP-161 (https://eips.ethereum.org/EIPS/eip-161).
   */
  // async cleanupTouchedAccounts() {
  //   if (this._common.gteHardfork("spuriousDragon")) {
  //     const touchedArray = Array.from(this._touched);
  //     for (const address of touchedArray) {
  //       const empty = await this.accountIsEmpty(address);
  //       if (empty) {
  //         this._cache.del({ buf: address } as any);
  //       }
  //     }
  //   }
  //   this._touched.clear();
  // }
}
