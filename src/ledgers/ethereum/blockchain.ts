import EthereumJsBLock from "ethereumjs-block";
import Tag from "../../types/tags";
import {JsonRpcData} from "../../types/hex-data";

class Account {
    public balance: bigint
}

type AccountManager = {
    readonly [index: string]: Promise<Block>;
}

class Block extends EthereumJsBLock {
    private _accounts: any;
    public accounts: AccountManager
    constructor(data: Buffer) {
        super(data);

        const self = this;

        this._accounts = {
            async getAccount(number: JsonRpcData): Promise<Account> {
                return new Account();
            }
        }
        this.accounts = new Proxy(this, {
            async get (obj, key: any): Promise<Block>{
                return self._accounts.getAccount(key);
            }
        }) as any;
    }
    
}

type BlockManager = {
    readonly [index: string]: Promise<Block>;
}

export default class Blockchain {
    public blocks: BlockManager;
    private _blocks: any;

    constructor(){
        const self = this;
        this._blocks = {
            async getBlock(number: string): Promise<Block> {
                const b = new Block(Buffer.from([]));
                b.header.number = Buffer.from([number]);
                return b;
            }
        }
        this.blocks = new Proxy(this, {
            async get (obj, key: string|Tag): Promise<Block> {
                if (key === "latest" || key === "earliest" || key === "pending") {
                    return self._blocks.getBlock("111111");
                }
                return self._blocks.getBlock(key);
            }
        }) as any;
    }
    public async latest() {
        const block = new Block(Buffer.from([]));
        block.header.number = Buffer.from([111111]);
        return block;
    }
}