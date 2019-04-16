import EthereumJsBlock from "ethereumjs-block";
import Database from "../database";
import Manager, {Executor} from "./manager";
import PromiseChain from "./promise-chain";

export default class BlockManager extends Manager<Block> {
    constructor(db: Database) {
        super(db, Block);
    }
}

export class Block extends PromiseChain<Block, EthereumJsBlock> {
    // public accounts: AccountManager;

    constructor(executor: Executor<Buffer>)
    constructor(pendingRawBlock: Promise<Buffer>)
    constructor(arg1: Executor<Buffer> | Promise<Buffer>, db?: Database)
    {
        super(arg1, EthereumJsBlock, db);
    }
}
