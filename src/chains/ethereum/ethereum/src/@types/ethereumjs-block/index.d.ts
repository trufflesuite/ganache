declare module "ethereumjs-block" {
  import BN from "bn.js";
  import { Blockchain } from "ethereumjs-blockchain";
  import Transaction from "ethereumjs-tx";
  import BlockHeader from "ethereumjs-block/header";
  import Trie from "merkle-patricia-tree/baseTrie";

  type LargeNumber = string | Buffer | BN;
  type Callback<T> = (err: Error | null, result: T) => void;

  export interface IBlock {
    transactions: Transaction[];
    uncleHeaders: BlockHeader[];
    txTrie: Trie;
    header: BlockHeader;
  }

  export class Block {
    transactions: Transaction[];
    uncleHeaders: BlockHeader[];
    txTrie: Trie;
    header: BlockHeader;
    raw: Buffer[];

    constructor(
      data: Buffer | [Buffer[], Buffer[], Buffer[]] | BlockData = {},
      opts: ChainOptions = {}
    );
    hash(): Buffer;
    isGenesis(): boolean;
    setGenesisParams(): void;
    serialize(rlpEncode: boolean): Buffer;
    genTxTrie(cb: Callback<never>): void;
    validateTransactionTrie(): boolean;
    validateTransactions(sringError: boolean): boolean | string;
    validate(blockChain: Blockchain, cb: Callback<string>): void;
    validateUnclesHash(): boolean;
    validateUncles(blockChain: Blockchain, cb: Callback<string>): void;
    toJSON(labeled?: boolean): object;
  }

  export default Block;
}
