import Emittery from "emittery";
import { dir } from "tmp-promise";
import levelup from "levelup";
import Blockchain from "./blockchain";
const leveldown = require("leveldown");
const sub = require( "subleveldown");
const encode = require("encoding-down");

type DatabaseOptions = {db?: string | object, dbPath?: string};

export default class Database extends Emittery{
    public readonly blockchain: Blockchain;
    private readonly options: DatabaseOptions;
    public directory: string = null;
    public db: levelup.LevelUp = null;
    public blocks: levelup.LevelUp;
    public blockLogs: levelup.LevelUp;
    public blockHashes: levelup.LevelUp;
    public transactions: levelup.LevelUp;
    public transactionReceipts: levelup.LevelUp;
    public trie: levelup.LevelUp;
    public readonly initialized: boolean;
    /**
     * The Database handles the creation of the database, and all access to it.
     * Once the database has been fully initialized it will emit a `ready`
     * event.
     * Emit's a `close` event once complete.
     * @param options Supports one of two options: `db` (a leveldown compliant
     * store instance) or `dbPath` (the path to store/read the db instance)
     * @param blockchain 
     */
    constructor(options: DatabaseOptions, blockchain: Blockchain) {
        super();

        this.options = options;
        this.blockchain = blockchain;
        this._initialize();
    }
    private async _initialize(){
        const levelupOptions: any = { valueEncoding: "binary" };
        const store = this.options.db;
        let db;
        if (store) {
            db = await levelup(store as any, levelupOptions);
        } else {
            let directory = this.options.dbPath;
            if (!directory) {
                directory = (await dir()).path;
            }
            this.directory = directory;
            const store = encode(leveldown(directory), levelupOptions);
            db = await levelup(store, {});
        }

        const open = db.open();
        this.trie = sub(db, "trie", levelupOptions);

        this.db = db;
        await open;
        this.blocks = sub(db, "blocks", levelupOptions);
        this.transactions = sub(db, "transactions", levelupOptions);
        return this.emit("ready");
    }
    /**
     * Gracefully close the database and wait for it to fully shut down.
     * Emit's a `close` event once complete.
     */
    public async close() {
        const db = this.db;
        if (db && db.isOpen()) {
            await db.close();
        }
        return this.emit("close");
    }
}
