declare module 'merkle-patricia-tree/readStream' {
  import Trie from 'merkle-patricia-tree/baseTrie'
  import { Readable } from 'stream'

  export class TrieReadStream extends Readable {
    constructor(trie: Trie)
  }

  export default TrieReadStream
}
