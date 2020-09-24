import Transaction from "../things/transaction";
import Manager from "./manager";
import TransactionPool from "./transaction-pool";
import { EthereumInternalOptions } from "../options";
import { LevelUp } from "levelup";
import Blockchain from "../blockchain";
import { Data } from "@ganache/utils";
import Common from "ethereumjs-common";

export default class TransactionManager extends Manager<Transaction> {
  public transactionPool: TransactionPool;

  constructor(options: EthereumInternalOptions["miner"], common: Common, blockchain: Blockchain, base: LevelUp) {
    super(base, Transaction, common);

    this.transactionPool = new TransactionPool(options, blockchain);
    this.transactionPool.on("drain", () => {
      // TODO: create "pending" block?
    });
  }

  public push(transaction: Transaction, secretKey?: Data) {
    return this.transactionPool.insert(transaction, secretKey);
  }
}
