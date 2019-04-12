import Tag from "../../types/tags";
import Database from "./database";
import {JsonRpcData} from "../../types/json-rpc";
import Address from "../../types/address";
import Account from "../../types/account";
import Transaction from "../../types/transaction";
import Emittery from "emittery";
import EthereumJsBLock from "ethereumjs-block";

// TODO: all the Promises stuff has got to go. I think we'll can just use get and set instead.
// and will very closely mimic what ganache already uses. We likely don't need to use our
// current serialization techniques, and can instead store the data as an RLP-encoded buffer.
// That said.. most ethereumjs-* stuff has a `raw` field that likely holds everything we want to serialize.
// If we can just efficiently (time, not so much space) encode/decode that into a flat buffer (which
// is part of what rlp encoding does, e.g. `block.serialize(true)`) maybe we can use that instead.
// Of course... maybe JSON is even faster. There is alsothe option of using protocol buffers in leveldb.

type AccountManager = {
    readonly [index: string]: Promise<Account>;
}
type TransactionManager = {
    readonly [index: string]: Promise<Transaction>;
}

class Block { // extends EthereumJsBLock {
    private _accounts: any;
    public accounts: AccountManager
    private _transactions: any;
    public transactions: TransactionManager;
    public header: any = {};
    public block: EthereumJsBLock
    constructor(data: Buffer) {
        // super(data);
        this.block = new EthereumJsBLock(data);

        const self = this;

        this._accounts = {
            async getAccount(number: Address): Promise<Account> {
                return new Account(number);
            }
        }
        this.accounts = new Proxy(this, {
            async get (obj, key: any): Promise<Account>{
                return self._accounts.getAccount(key);
            }
        }) as any as AccountManager;

        this._transactions = {
            async getTransaction(number: Address): Promise<Transaction> {
                return new Transaction();
            }
        }
        this.transactions = new Proxy(this, {
            async get (obj, key: any): Promise<Transaction>{
                return self._transactions.getTransaction(key);
            }
        }) as any as TransactionManager;
    }
    
}


type BlockManager = {
    get: (key: string) => LivePromiseBlock,
    set: (key: string, value: any) => LivePromiseBlock
}
type LivePromiseBlock = Promise<Block> & Block;
type LivePromiseTransactionManager = Promise<TransactionManager> & TransactionManager;

export default class Blockchain extends Emittery {
    public blocks: BlockManager;
    private _blocks: any;

    constructor() {
        super();
        const self = this;
        const db = new Database({});
        const getBlock = (number: string): LivePromiseBlock => {
            var p = new Promise(async (resolve, reject) => {
                const raw = await db.blocks.get(number).catch( e => {
                    return null;
                });

                // TODO: just POC stuff i was working on...
                let b = null;
                if (raw) {
                    b = new Block(raw);
                }

                resolve(b);
            }) as LivePromiseBlock;
            p.transactions = new Proxy(this, {
                get (obj, key: string|Tag): TransactionManager {
                    return p.then((block) => {
                        return block.transactions[key];
                    }) as any as TransactionManager;
                }
            }) as any as TransactionManager;
            return p;
        };
        this.blocks = {
            get(key: string): LivePromiseBlock {
                return getBlock(key);
            },
            set(key: string, value: any): LivePromiseBlock {
                return db.blocks.put(key, value) as any as LivePromiseBlock;
            }
        }
        db.on("ready", this.emit.bind(this, "ready"));
    }
    public async latest() {
        const block = new Block(Buffer.from([]));
        block.header.number = Buffer.from([111111]);
        return block;
    }
}