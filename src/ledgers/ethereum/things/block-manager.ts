import EthereumJsBlock from "ethereumjs-block";
import Database from "../database";
import Manager from "./manager";
const Heap: any = require("heap")

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

    constructor(db: Database) {
        super(db, Block, "block");

        db.once("open").then(() => {
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
        const block = new Block(null);
        // TODO: make better
        Object.assign(block.value.header, header);
        return block;
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
    constructor(raw: Buffer, manager?: BlockManager)
    {
        this.value = new EthereumJsBlock(raw);
        this.manager = manager;
        // const byAddresses:any = {};
        // this._transactions.byPriceAndNonce = new Heap((a:any, b:any) => {
        //     let aAccountOrder = byAddresses[a.address];
        //     let first = aAccountOrder.peek();
        //     if (first === a) {
        //         // sort by gasPrice
        //         return a.gasPrice - b.gasPrice;
        //     }
        //     if (a.address === b.address) {
        //         return b.nonce - a.nonce;
        //     } else {
        //         // otherwise sort by gasPrice
        //         return a.gasPrice - b.gasPrice;
        //     }
        // });
        // this.transactions = {
        //     push: (transaction: any) => {
        //         // get the first tx by account (via nonce)
        //         // then sort by price
        //         let addressHeap = byAddresses[transaction.address];
        //         if (!addressHeap) { // to check for equality and then compare by gasPrice.
        //             addressHeap = new Heap((a:any, b:any) => {
        //                 return b.nonce - a.nonce;
        //             });
        //             byAddresses[transaction.address] = addressHeap;
        //         }
        //         addressHeap.push(transaction);
                
        //         this.transactions.byPriceAndNonce.push(transaction);
                
        //     }
        // };
    }
    // _transactions: {
    //     byAddresses: any,
    //     byPriceAndNonce: any,
    // }
    // // TODO: https://ethereum.stackexchange.com/a/2809/44640
    // transactions: any
}
