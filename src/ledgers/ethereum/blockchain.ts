import EthereumJsBLock from "ethereumjs-block";
import Tag from "../../types/tags";
import HexData from "../../types/hex-data";

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
            async getAccount(number: HexData): Promise<Account> {
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
            async getBlock(number: bigint|Tag): Promise<Block> {
                const b = new Block(Buffer.from([]));
                b.header.number = Buffer.from(number.toString(16));
                return b;
            }
        }
        this.blocks = new Proxy(this, {
            async get (obj, key: any): Promise<Block>{
                return self._blocks.getBlock(key);
            }
        }) as any;
    }
    public async latest() {
        const block = new Block(Buffer.from([]));
        block.header.number = Buffer.from([1]);
        return block;
    }
}