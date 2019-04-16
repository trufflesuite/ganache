import Tag from "../../types/tags";
import Database from "./database";
import Emittery from "emittery";
import BlockManager from "./things/block-manager";
import TransactionManager from "./things/transaction-manager";

export default class Blockchain extends Emittery {
    public readonly blocks: BlockManager;
    public readonly transactions: TransactionManager;

    constructor() {
        super();
        const db = new Database({});
        this.blocks = new BlockManager(db);
        this.transactions = new TransactionManager(db);
        db.on("ready", this.emit.bind(this, "ready"));
    }
    public async latest() {
        // const block = new Block(Buffer.from([]));
        // block.header.number = Buffer.from([111111]);
        // return block;
    }
}