import EthereumJsBlock from "ethereumjs-block";
import Manager from "./manager";
import Tag from "../../../types/tags";
import levelup = require("levelup");
import Blockchain from "../blockchain";

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
            // the key is probably a hex string, let nature takes it's course.
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
    set(block: Block): Promise<Block>
    set(key: string | Buffer, value: Buffer): Promise<Block>
    set(keyOrBlock: string | Buffer | Block, value?: Buffer | Block): Promise<Block> {
        let key: string | Buffer;
        if (keyOrBlock instanceof Block){
            key = keyOrBlock.value.header.number;
            value = keyOrBlock.value.serialize(true);
        } else if (value instanceof Block) {
            value = value.value.serialize(true);
        }
        
        // ethereumjs-block treats [0] as [] :-()
        if (Buffer.isBuffer(key) && key.equals(Buffer.from([]))){
            key = Buffer.from([0]);
        }
        return super.set(key, value);
    }
}

export class Block {
    public readonly manager: BlockManager;
    public readonly value: EthereumJsBlock;
    constructor(raw: Buffer, manager: BlockManager)
    {
        this.value = new EthereumJsBlock(raw);
        this.manager = manager;
    }
}
