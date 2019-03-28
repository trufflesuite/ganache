

declare module 'ethereumjs-block/header' {
    import BN from 'bn.js'
    import { Block } from 'ethereumjs-block'
    import { Blockchain } from 'ethereumjs-blockchain'
  
    type LargeNumber = string | Buffer | BN
    type Callback<T> = (err: Error | null, result: T) => void
  
    export interface IBlockHeader {
      parentHash: Buffer
      uncleHash: Buffer
      coinbase: Buffer
      stateRoot: Buffer
      transactionTrie: Buffer
      receiptTrie: Buffer
      bloom: Buffer
      difficulty: Buffer
      number: Buffer
      gasLimit: Buffer
      gasUsed: Buffer
      timestamp: Buffer
      extraData: Buffer
    }
  
    export class BlockHeader {
      parentHash: Buffer
      uncleHash: Buffer
      coinbase: Buffer
      stateRoot: Buffer
      transactionTrie: Buffer
      receiptTrie: Buffer
      bloom: Buffer
      difficulty: Buffer
      number: Buffer
      gasLimit: Buffer
      gasUsed: Buffer
      timestamp: Buffer
      extraData: Buffer
      raw: Buffer[]
  
      constructor(data: LargeNumber | IBlockHeader)
      serialize(): Buffer
      canonicalDifficulty(block: Block): BN
      validateDifficulty(block: Block): boolean
      validateGasLimit(block: Block): boolean
      validate(blockChain: Blockchain, height: BN | Callback<never>, cb?: Callback<never>): void
      hash(): Buffer
      isGenesis(): boolean
      toJSON(labeled: boolean): object
    }
  
    export default BlockHeader
  }