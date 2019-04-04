// import EthereumJsBLock from "ethereumjs-block";
import Tag from "../../types/tags";
import {JsonRpcData} from "../../types/json-rpc";
import Address from "../../types/address";
import Account from "../../types/account";
import Transaction from "../../types/transaction";

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
    constructor(data: Buffer) {
        // super(data);

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
    readonly [index: string]: LivePromiseBlock;
}
type LivePromiseBlock = Promise<Block> & Block;
type LivePromiseTransactionManager = Promise<TransactionManager> & TransactionManager;

export default class Blockchain {
    public blocks: BlockManager;
    private _blocks: any;

    constructor() {
        const self = this;
        const getBlock = (number: string): LivePromiseBlock => {
            var p = new Promise(async (resolve) => {
                const b = new Block(Buffer.from([]));
                b.header.number = Buffer.from([number]);
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
        this.blocks = new Proxy(this, {
            get (obj, key: string|Tag): LivePromiseBlock {
                if (key === "latest" || key === "earliest" || key === "pending") {
                    return getBlock("111111");
                }
                return getBlock(key);
            }
        }) as any as BlockManager;
    }
    public async latest() {
        const block = new Block(Buffer.from([]));
        block.header.number = Buffer.from([111111]);
        return block;
    }
}