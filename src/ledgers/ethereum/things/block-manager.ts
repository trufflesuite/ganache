import EthereumJsBlock from "ethereumjs-block";
import Database from "../database";
import Manager from "./manager";

export default class BlockManager extends Manager<Block> {

    // We cache these:
    public earliest: Block;
    public latest: Block;
    public pending: Block;

    constructor(db: Database) {
        super(db, Block, "block");

        db.once("open").then(() => {
            // TODO: get the last key, set as "earliest"
            // TODO: get the first last key, set as "latest"
        });
    }
}

export class Block {
    public readonly manager: BlockManager;
    public readonly value: EthereumJsBlock;
    constructor(raw: Buffer, manager?: BlockManager)
    {
        this.value = new EthereumJsBlock(raw);
        this.manager = manager;
    }
}
