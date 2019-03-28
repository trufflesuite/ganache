declare module 'merkle-patricia-tree/baseTrie' {
  import BN from 'bn.js'

  import TrieNode from 'merkle-patricia-tree/trieNode'
  import ReadStream from 'merkle-patricia-tree/readStream'

  type Callback<T> = (err: Error | null, result: T) => void
  type FindPathCallback = (err: Error, node: TrieNode, keyRemainder: Buffer, stack: TrieNode[]) => void
  type LargeNumber = string | Buffer | BN

  
  // Rather than using LevelUp here, specify the minimal interface we need
  // so that other structurally identical types can be used in its place
  export interface Database {
    get(key: Buffer, opt: any, cb: Callback<Buffer>): void
    put(key: Buffer, val: Buffer, options: any, cb: Callback<never>): void
    del(key: Buffer, opt: any, cb: Callback<never>): void
  }

  export interface BatchOperation {
    type: 'del' | 'put'
    key: LargeNumber
    value?: LargeNumber
  }

  export class Trie {
    root: Buffer
    constructor(db: Database, root: Buffer)
    get(key: LargeNumber, cb: Callback<Buffer | null>): void
    put(key: LargeNumber, value: LargeNumber, cb: Callback<never>): void
    del(key: LargeNumber, cb: Callback<never>): void
    getRaw(key: LargeNumber, cb: Callback<Buffer | null>): void
    findPath(key: LargeNumber, cb: FindPathCallback): void
    createReadStream(): ReadStream
    copy(): Trie
    batch(ops: BatchOperation[], cb: (err: Error[]) => void): void
    checkRoot(root: LargeNumber, cb: Callback<boolean>): void
  }

  export default Trie
}
