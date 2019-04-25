import Transaction from "../../../types/transaction";
import Manager from "./manager";
import TransactionPool, {TransactionPoolOptions} from "./transaction-pool";
import levelup = require("levelup");
import Blockchain from "../blockchain";

export type TransactionManagerOptions = TransactionPoolOptions;

export default class TransactionManager extends Manager<any> {
    public transactionPool: TransactionPool;

    constructor(blockchain: Blockchain, base: levelup.LevelUp, options: TransactionManagerOptions) {
        super(blockchain, base, Transaction);

        this.transactionPool = new TransactionPool(blockchain, options);
        this.transactionPool.on("drain", (transactions: any[]) => {
            // TODO: create pending block?
        });
    }

    public push(transaction: Transaction): Promise<void> {
        return this.transactionPool.insert(transaction);
    }
}
