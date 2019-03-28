declare module 'merkle-patricia-tree' {
  import BN from 'bn.js'
  import { Readable } from 'stream'

  import { Trie, Database } from 'merkle-patricia-tree/baseTrie'
  import TrieNode from 'merkle-patricia-tree/trieNode'

  type MerkleProof = TrieNode[]
  type Callback<T> = (err: Error | null, result: T) => void
  type LargeNumber = string | Buffer | BN

  export class ScratchReadStream extends Readable {
    trie: Trie
  }

  export class CheckpointTrie extends Trie {
    readonly isCheckpoint: boolean

    checkpoint(): void
    commit(cb: Callback<never>): void
    revert(cb: Callback<never>): void
    createScratchReadStream(scratch: Database): ScratchReadStream
    static prove(trie: Trie, key: LargeNumber, cb: Callback<MerkleProof>): void
    static verifyProof(rootHash: LargeNumber, key: LargeNumber, proof: MerkleProof, cb: Callback<Buffer>): void
  }

  export default CheckpointTrie
}
