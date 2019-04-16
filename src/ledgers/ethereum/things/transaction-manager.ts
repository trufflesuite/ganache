import _Transaction from "../../../types/transaction";

import Database from "../database";
import Manager, {Executor} from "./manager";
import PromiseChain from "./promise-chain";

export default class TransactionManager extends Manager<any> {
    constructor(db: Database) {
        super(db, Transaction);
    }
}

export class Transaction extends PromiseChain<Transaction, _Transaction> {
    constructor(executor: Executor<Buffer>)
    constructor(pendingRawBlock: Promise<Buffer>)
    constructor(arg1: Executor<Buffer> | Promise<Buffer>, db?: Database) {
        super(arg1, _Transaction, db);
    }
}
