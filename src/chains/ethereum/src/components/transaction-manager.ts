import Transaction from "../things/transaction";
import Manager from "./manager";
import TransactionPool, {TransactionPoolOptions} from "./transaction-pool";
import { LevelUp } from "levelup";
import Blockchain from "../blockchain";
import { Data } from "@ganache/utils/src/things/json-rpc";
import Common from "ethereumjs-common";

export type TransactionManagerOptions = TransactionPoolOptions & {
  common: Common
};

export default class TransactionManager extends Manager<Transaction> {
  public transactionPool: TransactionPool;

  constructor(blockchain: Blockchain, base: LevelUp, options: TransactionManagerOptions) {
    super(base, Transaction, {common: options.common});

    this.transactionPool = new TransactionPool(blockchain, options);
    this.transactionPool.on("drain", () => {
      // TODO: create "pending" block?
    });
  }

  public push(transaction: Transaction, secretKey?: Data): Promise<void> {
    return this.transactionPool.insert(transaction, secretKey);
  }
}
