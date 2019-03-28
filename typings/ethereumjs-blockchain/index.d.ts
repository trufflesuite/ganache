declare module 'ethereumjs-blockchain' {
    import BN from 'bn.js'
    import { LevelUp } from 'levelup'
    import { Block } from 'ethereumjs-block'
  
    type BlockTag = Buffer | BN | number
    type Callback<T> = (err: Error | null, result: T) => void
    type OnBlock = (block: Block, reorg: boolean, cb: Callback<never>) => void
  
    export interface BlockchainOptions {
      db: LevelUp
      cb: Callback<Block>
    }
  
    export class Blockchain {
      constructor(opts: BlockchainOptions)
      putGenesis(genesis: Block, cb: Callback<Block>): void
      getHead(name: string, cb: Callback<Block>): void
      getLatestHeader(cb: Callback<Block>): void
      getLatestBlock(cb: Callback<Block>): void
      putBlocks(blocks: Block[], cb: Callback<Block>): void
      putBlock(block: Block, cb: Callback<Block>): void
      getBlock(blockTag: BlockTag, cb: Callback<Block>): void
      getBlocks(blockId: BlockTag, maxBlocks: number, skip: number, reverse: boolean, cb: Callback<Block[]>): void
      selectNeededHashes(hashes: Buffer, cb: Callback<Buffer[]>): void
      delBlock(blockHash: Buffer, cb: Callback<never>): void
      iterator(name: string, onBlock: OnBlock, cb: Callback<never>): void
    }
  
    export default Blockchain
  }