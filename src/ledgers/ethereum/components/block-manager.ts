import EthereumJsBlock from "ethereumjs-block";
import Manager from "./manager";
import Tag from "../../../types/tags";
import levelup from "levelup";
import Blockchain from "../blockchain";
import { Quantity, Data } from "../../../types/json-rpc";
import Transaction from "../../../types/transaction";
import { rlp } from "ethereumjs-util";
import Common from "ethereumjs-common";

export default class BlockManager extends Manager<Block> {
    /**
     * The earliest block
     */
    public earliest: Block;

    /**
     * The latest block
     */
    public latest: Block;

    /**
     * The next block
     */
    public pending: Block;

    constructor(blockchain: Blockchain, base: levelup.LevelUp) {
        super(blockchain, base, Block);

        blockchain.on("open", () => {
            // TODO: get the last key, set as "earliest"
            // TODO: get the first last key, set as "latest"
        });
    }

    /**
     * Gets or creates the next block (which might be the *pending* block). Uses the values in the optional `header` object to create the block
     * @param header The values to set on the block's header. These typically come from the parent block.
     */
    next(header?: {}) {
        if (!this.pending) {
            this.pending = this.createBlock(header);
        }
        return this.pending;
    }

    /**
     * Creates a Block object with the specified header values
     * @param header 
     */
    createBlock(header: {}): Block {
        const block = new Block(null, this);
        // TODO: make better
        Object.assign(block.value.header, header);
        return block;
    }

    async get(keyOrBlock: string | Buffer | Tag): Promise<Block> {
      if (typeof keyOrBlock === "string") {
        const tag = Tag.normalize(keyOrBlock as Tag);
        switch (tag) {
          case Tag.LATEST:
            return this.latest;
          case undefined:
          case null:
            // the key is probably a hex string, let nature takes its course.
          break;
          case Tag.PENDING:
            return this.pending;
          case Tag.EARLIEST:
            return this.earliest;
          default:
            // this probably can't happen. but if someone passed something like
            // `toString` in as a block tag and it got this far... maybe we'd
            // get here...
            throw new Error(`Invalid block Tag: ${keyOrBlock}`);
        }
      }
      return super.get(keyOrBlock);
    }

    /**
     * Writes the block object to the underlying database.
     * @param block 
     */
    async putBlock(block: Block) {
      let key = block.value.header.number;        
      if (Buffer.isBuffer(key) && key.equals(Buffer.from([]))){
          key = Buffer.from([0]);
      }
      const secondaryKey = block.value.header.hash();
      const value = block.value.serialize(true);
      await Promise.all([
        super.set(secondaryKey, key),
        super.set(key, value)
      ]);
      return block;
    }
}

export class Block {
    public readonly manager: BlockManager;
    public readonly value: EthereumJsBlock;
    constructor(raw: Buffer, manager: BlockManager)
    {
      const common = {common: new Common("mainnet", "istanbul")};
      if(raw) {
        const data = rlp.decode(raw) as any as [Buffer[], Buffer[], Buffer[]];
        this.value = new EthereumJsBlock({header: data[0], uncleHeaders: data[2]}, common);
        const rawTransactions = data[1];
  
        // parse transactions so we can use our own transaction class
        for (let i = 0; i < rawTransactions.length; i++) {
          // TODO: Pass the common object instead of the options. It can't be implemented right now
          // because the hardfork may be `null`. Read the above TODO for more info.
          const tx = new Transaction(rawTransactions[i]);
          this.value.transactions.push(tx)
        }
      } else {
        this.value = new EthereumJsBlock(null, common);
      }
      
      this.manager = manager;
    }

  private getTxFn(include = false): (tx: Transaction) => {[key: string] : string} | Data {
    if (include) {
      return (tx: Transaction) => tx.toJSON(this)
    } else {
      return (tx: Transaction) => Data.from(tx.hash());
    }
  }

  toJsonRpc(includeFullTransactions = false) {
    return {
      number: Quantity.from(this.value.header.number),
      hash: Data.from(this.value.hash()),
      parentHash: Data.from(this.value.header.parentHash), // common.hash
      mixHash: Data.from(this.value.header.mixHash),
      nonce: Data.from(this.value.header.nonce, 16),
      sha3Uncles: Data.from(this.value.header.uncleHash),
      logsBloom: Data.from(this.value.header.bloom),
      transactionsRoot: Data.from(this.value.header.transactionsTrie),
      stateRoot: Data.from(this.value.header.stateRoot),
      receiptsRoot: Data.from(this.value.header.receiptTrie),
      miner: Data.from(this.value.header.coinbase),
      difficulty: Quantity.from(this.value.header.difficulty),
      totalDifficulty: Quantity.from(this.value.header.difficulty), // TODO: Figure out what to do here.
      extraData: Data.from(this.value.header.extraData),
      size: Quantity.from(1000), // TODO: Do something better here
      gasLimit: Quantity.from(this.value.header.gasLimit),
      gasUsed: Quantity.from(this.value.header.gasUsed),
      timestamp: Quantity.from(this.value.header.timestamp),
      transactions: this.value.transactions.map(this.getTxFn(includeFullTransactions)),
      uncles: [] as string[] // this.value.uncleHeaders.map(function(uncleHash) {return to.hex(uncleHash)})
    };
  }
}
