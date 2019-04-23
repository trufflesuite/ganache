import Transaction from "../../../types/transaction";
import Database from "../database";
import Manager from "./manager";
import TransactionPool from "./transaction-pool";

export default class TransactionManager extends Manager<any> {
    public transactionPool: TransactionPool;

    constructor(db: Database) {
        super(db, Transaction, "transactions");

        this.transactionPool = new TransactionPool(db);
        this.transactionPool.on("drain", (transactions: any[]) => {
            transactions
        })
    }

    public push(transaction: Transaction): Promise<void> {
        return this.transactionPool.insert(transaction);
    }
}

// export class Transaction {
//     private readonly manager: TransactionManager;
//     public readonly value: _Transaction;
//     constructor(raw: Buffer, manager?: TransactionManager) {
//         // todo: make _Transaction take the raw Buffer
//         this.value = new _Transaction(/*raw*/);
//         this.manager = manager;
//     }
// }
