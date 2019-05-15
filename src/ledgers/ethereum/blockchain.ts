import Miner from "./miner";
import Database from "./database";
import Emittery from "emittery";
import BlockManager, { Block } from "./components/block-manager";
import TransactionManager from "./components/transaction-manager";
import Trie from "merkle-patricia-tree";
import { BN } from "ethereumjs-util";
import Account from "../../types/account";
import { promisify } from "util";
import { Quantity, Data } from "../../types/json-rpc";
import EthereumJsAccount from "ethereumjs-account";
import AccountManager from "./components/account-manager";
import Heap from "../../utils/heap";
import Transaction from "../../types/transaction";

const VM = require("ethereumjs-vm");

type BlockchainOptions = {
    db?: string | object,
    db_path?: string,
    accounts?: Account[],
    hardfork?: string,
    allowUnlimitedContractSize?: boolean,
    gasLimit?: Quantity,
    timestamp?: Date
};

export default class Blockchain extends Emittery {
    public blocks: BlockManager;
    public transactions: TransactionManager;
    public accounts: AccountManager;
    public vm: any;
    public trie: Trie;
    private readonly database: Database

    /**
     * Initializes the underlying Database and handles synchronization between
     * the ledger and the database.
     * 
     * Emits a `ready` event once the database and
     * all dependencies are fully initialized.
     * @param options 
     */
    constructor(options: BlockchainOptions) {
        super();

        const database = this.database = new Database(options, this); 

        database.on("ready", async () => {
            // TODO: get the latest block from the database
            // if we have a latest block, `root` will be that block's header.stateRoot
            // and we will skip creating the genesis block alltogether
            const root:any = null;
            this.trie = new Trie(database.trie, root);
            this.blocks = new BlockManager(this, database.blocks);
            this.transactions = new TransactionManager(this, database.transactions, options);
            this.accounts = new AccountManager(this);

            this._initializeVM(options.hardfork, options.allowUnlimitedContractSize);

            const miner = new Miner(this.vm, options);
            
            const instamining = true;
            if (instamining) {
                this.transactions.transactionPool.on("drain", async (pending: Map<string, Heap<Transaction>>) => {
                    await miner.mine(pending);
                });
            } else {
                const minerInterval = 3 * 1000;
                const mine = async (pending: Map<string, Heap<Transaction>>) => {
                    await miner.mine(pending);
                    setTimeout(mine, minerInterval, pending);
                };
                setTimeout(mine, minerInterval, this.transactions.transactionPool.executables);
            }

            await this._initializeAccounts(options.accounts);
            let lastBlock = this._initializeGenesisBlock(options.timestamp, options.gasLimit);
            await lastBlock;
            miner.on("block", async (blockData: any) => {
                const previousBlock = await lastBlock;
                const previousHeader = previousBlock.value.header;
                const previousNumber = Quantity.from(previousHeader.number).toBigInt() || 0n;
                const block = this.blocks.createBlock({
                    number: Quantity.from(previousNumber + 1n).toBuffer(),
                    gasLimit: options.gasLimit.toBuffer(),
                    timestamp: this.currentTime(),
                    parentHash: previousHeader.hash(),
                    transactionsTrie: blockData.transactionsTrie.root,
                    receiptTrie: blockData.receiptTrie.root
                });
                console.log( Quantity.from(block.value.header.number).toBigInt() );
                
                lastBlock = this.blocks.set(block);
            });

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
        const l = accounts.length;
        const pendingAccounts = Array(l);
        for (let i = 0; i < l; i++) {
            const account = accounts[i];
            const ethereumJsAccount = new EthereumJsAccount();
            ethereumJsAccount.nonce = account.nonce.toBuffer(),
            ethereumJsAccount.balance = account.balance.toBuffer()
            pendingAccounts[i] = putAccount(account.address.toBuffer(), ethereumJsAccount);
        }
        await Promise.all(pendingAccounts);
        return commit();
    }

    async _initializeGenesisBlock(timestamp: Date, blockGasLimit: Quantity): Promise<Block> {
        // create the genesis block
        const genesis = this.blocks.next({
            // If we were given a timestamp, use it instead of the `currentTime`
            timestamp: ((timestamp as any) / 1000 | 0) || this.currentTime(),
            gasLimit: blockGasLimit.toBuffer(),
            stateRoot: this.trie.root,
            number: "0x0"
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

    async queueTransaction(transaction: any): Promise<Data> {
        await this.transactions.push(transaction);
        return Data.from(transaction.hash());
    }

    public async shutdown() {
        return this.database.close();
    }
}
