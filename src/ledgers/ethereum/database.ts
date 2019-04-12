import Emittery from "emittery";
const sub = require( "subleveldown");
import { dir } from "tmp-promise";
const leveldown = require("leveldown");
import levelup from "levelup";
const encode = require("encoding-down");
const cachedown = require("cachedown");

async function getDir(db_path: string) {
    if (db_path) {
      return db_path;
    } else {
      await dir();
    }
  }

export default class Database extends Emittery{
    private options: any;
    private directory: string = null;
    private db: levelup.LevelUp;
    public blocks: levelup.LevelUp;
    private blockLogs: levelup.LevelUp;
    private blockHashes: levelup.LevelUp;
    private transactions: levelup.LevelUp;
    private transactionReceipts: levelup.LevelUp;
    private stateTrie: levelup.LevelUp;
    private initialized: boolean;
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
        const self = this;

        // Blocks, keyed by array index (not necessarily by block number) (0-based)
        self.blocks = sub(db, "blocks", {valueEncoding: "binary"});

        // Logs triggered in each block, keyed by block id (ids in the blocks array; not necessarily block number) (0-based)
        self.blockLogs = sub(db, "blockLogs");

        // Block hashes -> block ids (ids in the blocks array; not necessarily block number) for quick lookup
        self.blockHashes = sub(db, "blockHashes");

        // Transaction hash -> transaction objects
        self.transactions = sub(db, "transactions");

        // Transaction hash -> transaction receipts
        self.transactionReceipts = sub(db, "transactionReceipts");

        self.stateTrie = sub(db, "stateTrie");

        this.db = db;
        await open;
        this.emit("ready");
    }
}