declare module "ethereumjs-block/header" {
  import BN from "bn.js";
  import { Block } from "ethereumjs-block";
  import { Blockchain } from "ethereumjs-blockchain";

  type LargeNumber = string | Buffer | BN;
  type Callback<T> = (err: Error | null, result: T) => void;

  export interface IBlockHeader {
    parentHash: Buffer;
    uncleHash: Buffer;
    coinbase: Buffer;
    stateRoot: Buffer;
    transactionTrie: Buffer;
    receiptTrie: Buffer;
    bloom: Buffer;
    difficulty: Buffer;
    number: Buffer;
    gasLimit: Buffer;
    gasUsed: Buffer;
    timestamp: Buffer;
    extraData: Buffer;
  }

  export class BlockHeader {
    public raw!: Buffer[];
    public parentHash!: Buffer;
    public uncleHash!: Buffer;
    public coinbase!: Buffer;
    public stateRoot!: Buffer;
    public transactionsTrie!: Buffer;
    public receiptTrie!: Buffer;
    public bloom!: Buffer;
    public difficulty!: Buffer;
    public number!: Buffer;
    public gasLimit!: Buffer;
    public gasUsed!: Buffer;
    public timestamp!: Buffer;
    public extraData!: Buffer;
    public mixHash!: Buffer;
    public nonce!: Buffer;

    constructor(
      data: Buffer | PrefixedHexString | BufferLike[] | BlockHeaderData = {},
      opts: ChainOptions = {}
    );
    serialize(): Buffer;
    canonicalDifficulty(block: Block): BN;
    validateDifficulty(block: Block): boolean;
    validateGasLimit(block: Block): boolean;
    validate(
      blockChain: Blockchain,
      height: BN | Callback<never>,
      cb?: Callback<never>
    ): void;
    hash(): Buffer;
    isGenesis(): boolean;
    toJSON(labeled: boolean): object;
  }

  export default BlockHeader;
}
