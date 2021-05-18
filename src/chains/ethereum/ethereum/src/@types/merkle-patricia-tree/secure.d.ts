declare module "merkle-patricia-tree/secure" {
  import { CheckpointTrie } from "merkle-patricia-tree";
  export default class SecureTrie extends CheckpointTrie {
    copy(): SecureTrie;
    static prove(
      trie: SecureTrie,
      key: LargeNumber,
      cb: Callback<MerkleProof>
    ): void;
  }
}
