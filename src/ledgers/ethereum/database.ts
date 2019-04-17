import Emittery from "emittery";
const sub = require( "subleveldown");
import { dir } from "tmp-promise";
const leveldown = require("leveldown");
import levelup from "levelup";
const encode = require("encoding-down");

export default class Database extends Emittery{
    private readonly options: any;
    public directory: string = null;
    public db: levelup.LevelUp = null;
    public blockLogs: levelup.LevelUp;
    public blockHashes: levelup.LevelUp;
    public transactions: levelup.LevelUp;
    public transactionReceipts: levelup.LevelUp;
    public trie: levelup.LevelUp;
    public readonly initialized: boolean;
    constructor(options: any) {
        super();

        this.options = options;
        this._initialize();
    }
    private async _initialize(){
        const levelupOptions: any = { valueEncoding: "binary" };
        // delete levelupOptions.valueEncoding;
        const store = this.options.db;
        let db;
        if (store) {
            db = await levelup(store, levelupOptions);
        } else {
            let directory = this.options.db_path;
            if (!directory) {
                directory = (await dir()).path;
            }
            this.directory = directory;
            const store = encode(leveldown(directory), levelupOptions);
            db = await levelup(store, {});
        }

        const open = db.open();
        //const self = this;

        // Logs triggered in each block, keyed by block id (ids in the blocks array; not necessarily block number) (0-based)
        //self.blockLogs = sub(db, "blockLogs", levelupOptions);

        // Block hashes -> block ids (ids in the blocks array; not necessarily block number) for quick lookup
        //self.blockHashes = sub(db, "blockHashes", levelupOptions);

        // // Transaction hash -> transaction objects
        // self.transactions = sub(db, "transactions", levelupOptions);

        // Transaction hash -> transaction receipts
        //self.transactionReceipts = sub(db, "transactionReceipts", levelupOptions);

        this.trie = sub(db, "trie", levelupOptions);

        this.db = db;
        await open;
        this.emit("ready");
    }
    public async close() {
        const db = this.db;
        if (db && db.isOpen()) {
            db.close();
        }
    }
}