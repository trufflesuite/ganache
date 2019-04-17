import _Transaction from "../../../types/transaction";

import Database from "../database";
import Manager from "./manager";

export default class TransactionManager extends Manager<any> {
    constructor(db: Database) {
        super(db, Transaction, "transactions");
    }
}

export class Transaction {
    private readonly manager: TransactionManager;
    public readonly value: _Transaction;
    constructor(raw: Buffer, manager?: TransactionManager) {
        // todo: make _Transaction take the raw Buffer
        this.value = new _Transaction(/*raw*/);
        this.manager = manager;
    }
}
