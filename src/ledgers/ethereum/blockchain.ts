import Database from "./database";
import Emittery from "emittery";
import BlockManager, { Block } from "./things/block-manager";
import TransactionManager from "./things/transaction-manager";
import Trie from "merkle-patricia-tree";
import { BN } from "ethereumjs-util";
import Account from "../../types/account";
import { promisify } from "util";
import { JsonRpcQuantity, JsonRpcData } from "../../types/json-rpc";
import EthereumJsAccount from "ethereumjs-account";

const VM = require("ethereumjs-vm");

export default class Blockchain extends Emittery {
    public blocks: BlockManager;
    public transactions: TransactionManager;
    private vm: any;
    private trie: Trie;
    private readonly database: Database

    /**
     * Initializes the underlying Database and handles synchronization between
     * the ledger and the database.
     * 
     * Emits a `ready` event once the database and
     * all dependencies are fully initialized.
     * @param db 
     * @param dbPath 
     * @param accounts 
     * @param hardfork 
     * @param allowUnlimitedContractSize 
     * @param blockGasLimit 
     * @param timestamp 
     */
    constructor(db: string | object, dbPath: string, accounts: Account[], hardfork: string, allowUnlimitedContractSize: boolean, blockGasLimit: JsonRpcQuantity, timestamp: Date) {
        super();

        const database = this.database = new Database({db, dbPath}, this); 

        database.on("ready", async () => {
            // TODO: get the latest block from the database
            // if we have a latest block, `root` will be that block's header.stateRoot
            // and we will skip creating the genesis block alltogether
            const root:any = null;
            this.trie = new Trie(database.trie, root);
            this.blocks = this.database.blocks;
            this.transactions = this.database.transactions;

            this._initializeVM(hardfork, allowUnlimitedContractSize);

            await this._initializeAccounts(accounts);
            await this._initializeGenesisBlock(timestamp, blockGasLimit);

            this.emit("ready");
        });
    }

    _initializeVM(hardfork: string, allowUnlimitedContractSize: boolean) {
        this.vm = new VM({
            state: this.trie,
            activatePrecompiles: true,
            hardfork,
            allowUnlimitedContractSize,
            blockchain: {
                getBlock: async (number: BN, done: any) => {
                    const hash = await this.blockNumberToHash(number);
                    done(this.blocks.get(hash));
                }
            }
        });
        this.vm.on("step", this.emit.bind(this, "step"));
    }

    async _initializeAccounts(accounts: Account[]) : Promise<void>{
        const stateManager = this.vm.stateManager;
        const putAccount = promisify(stateManager.putAccount.bind(stateManager));
        const checkpoint = promisify(stateManager.checkpoint.bind(stateManager))
        const commit = promisify(stateManager.commit.bind(stateManager))
        await checkpoint();
        const pendingAccounts = accounts
            .map(account => {
                const ethereumJsAccount = new EthereumJsAccount();
                ethereumJsAccount.nonce = account.nonce.toBuffer(),
                ethereumJsAccount.balance = account.balance.toBuffer()
                return {
                    account: ethereumJsAccount,
                    address: account.address
                }
            })
            .map(account => putAccount(account.address.toString(), account.account));
        await Promise.all(pendingAccounts);
        return commit();
    }

    async _initializeGenesisBlock(timestamp: Date, blockGasLimit: JsonRpcQuantity): Promise<Block> {
        // create the genesis block
        const genesis = this.blocks.next({
            // If we were given a timestamp, use it instead of the `currentTime`
            timestamp: ((timestamp as any) / 1000 | 0) || this.currentTime(),
            gasLimit: blockGasLimit.toBuffer(),
            stateRoot: this.trie.root
        });

        // store the genesis block in the database
        return this.blocks.set(genesis);
    }

    currentTime() {
        // Take the floor of the current time
        return (Date.now() / 1000) | 0;
    }

    /**
     * Given a block number, find it's hash in the database
     * @param number 
     */
    blockNumberToHash(number: BN): Promise<Buffer> {
        return number.toString() as any;
    }

    async queueTransaction(transaction: any): Promise<JsonRpcData> {
        await this.transactions.push(transaction);
        return JsonRpcData.from(transaction.hash());
    }
}
