import Miner from "./miner";
import Database from "./database";
import Emittery from "emittery";
import BlockManager, {Block} from "./components/block-manager";
import TransactionManager from "./components/transaction-manager";
import CheckpointTrie from "merkle-patricia-tree";
import {BN} from "ethereumjs-util";
import Account from "./things/account";
import {promisify} from "util";
import {Quantity, Data} from "@ganache/utils/src/things/json-rpc";
import EthereumJsAccount from "ethereumjs-account";
import AccountManager from "./components/account-manager";
import {utils} from "@ganache/utils";
import Transaction from "./things/transaction";
import Manager from "./components/manager";
import TransactionReceipt from "./things/transaction-receipt";
import {encode as rlpEncode} from "rlp";
import Common from "ethereumjs-common";

import VM from "ethereumjs-vm";

/**
 * In node, calling `unref(timer)` on a running timer ensures that the timer
 * does not require that the Node.js event remain active. If there is no other
 * activity keeping the event loop running, the process may exit before the
 * timer's callback is invoked.
 * @param timer
 * @returns `true` if the timer could be `unref`ed, otherwise returns `false`
 */
function unref (timer: NodeJS.Timeout | number): timer is NodeJS.Timeout {
  if (typeof timer === "object" && typeof timer.unref === "function") {
    timer.unref();
    return true;
  } else {
    return false;
  }
}

export enum Status {
  // Flags
  started = 1,		// 0000 0001
  starting = 2,		// 0000 0010
  stopped = 4,		// 0000 0100
  stopping = 8,		// 0000 1000
  paused = 16			// 0001 0000
}

type BlockchainOptions = {
  db?: string | object;
  db_path?: string;
  accounts?: Account[];
  hardfork?: string;
  allowUnlimitedContractSize?: boolean;
  gasLimit?: Quantity;
  time?: Date;
  blockTime?: number;
};

export default class Blockchain extends Emittery {
  #state: Status = Status.starting;
  public blocks: BlockManager;
  public transactions: TransactionManager;
  public transactionReceipts: Manager<TransactionReceipt>;
  public accounts: AccountManager;
  public vm: VM;
  public trie: CheckpointTrie;
  readonly #database: Database;

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

    const database = (this.#database = new Database(options, this));

    database.on("ready", async () => {
      // TODO: get the latest block from the database
      // if we have a latest block, `root` will be that block's header.stateRoot
      // and we will skip creating the genesis block alltogether
      const root: Buffer = null;
      this.trie = new CheckpointTrie(database.trie, root);
      this.blocks = new BlockManager(this, database.blocks);
      this.vm = this.createVmFromStateTrie(this.trie, options.hardfork, options.allowUnlimitedContractSize);

      const gasLimit = options.gasLimit;
      const instamine = !options.blockTime || options.blockTime <= 0;
      const miner = new Miner(this.vm, {instamine, gasLimit});

      this.transactions = new TransactionManager(this, database.transactions, options);
      this.transactionReceipts = new Manager<TransactionReceipt>(
        this,
        database.transactionReceipts,
        TransactionReceipt
      );
      this.accounts = new AccountManager(this, database.trie);

      await this.#initializeAccounts(options.accounts);
      let firstBlockTime: number;
      if (options.time != null) {
        firstBlockTime = +options.time
        this.setTime(firstBlockTime);
      } else {
        firstBlockTime = this.#currentTime();
      }
      let lastBlock = this.#initializeGenesisBlock(firstBlockTime, gasLimit);

      const readyNextBlock = async (timestamp?: number) => {
        const previousBlock = await lastBlock;
        const previousHeader = previousBlock.value.header;
        const previousNumber = Quantity.from(previousHeader.number).toBigInt() || 0n;
        return this.blocks.createBlock({
          number: Quantity.from(previousNumber + 1n).toBuffer(),
          gasLimit: gasLimit.toBuffer(),
          timestamp: timestamp || this.#currentTime(),
          parentHash: previousHeader.hash()
        });
      };

      if (instamine) {
        this.transactions.transactionPool.on("drain", async ({executables, timestamp, maxTransactions}: {maxTransactions: number ,executables: Map<string, utils.Heap<Transaction>>, timestamp?: number}) => {
          if (maxTransactions !== 0 && this.#isPaused()) return;
          const block = await readyNextBlock(timestamp);
          return miner.mine(executables, block.value, maxTransactions == null ? 1 : 0);
        });
      } else {
        const minerInterval = options.blockTime * 1000;
        const mine = (pending: Map<string, utils.Heap<Transaction>>) => {
          let promise: Promise<unknown>;
          if (!this.#isPaused()) {
            promise = readyNextBlock().then(block => {
              miner.mine(pending, block.value);
            });
          } else {
            promise = this.once("resume");
          }
          promise.then(() => unref(setTimeout(mine, minerInterval, pending)));
          return void 0;
        };
        unref(setTimeout(mine, minerInterval, this.transactions.transactionPool.executables));
      }

      miner.on("block", async (blockData: any) => {
        const previousBlock = await lastBlock;
        const previousHeader = previousBlock.value.header;
        const previousNumber = Quantity.from(previousHeader.number).toBigInt() || 0n;
        const block = this.blocks.createBlock({
          parentHash: previousHeader.hash(),
          number: Quantity.from(previousNumber + 1n).toBuffer(),
          // coinbase:
          timestamp: this.#currentTime(),
          // difficulty:
          gasLimit: options.gasLimit.toBuffer(),
          transactionsTrie: blockData.transactionsTrie.root,
          receiptTrie: blockData.receiptTrie.root,
          stateRoot: this.trie.root,
          gasUsed: Quantity.from(blockData.gasUsed).toBuffer()
        });

        this.blocks.latest = block;
        lastBlock = this.#database.batch(() => {
          blockData.blockTransactions.forEach((tx: Transaction, i: number) => {
            const hash = tx.hash();
            // todo: clean up transction extra data stuffs because this is gross:
            const extraData = [...tx.raw, block.value.hash(), block.value.header.number, Quantity.from(i).toBuffer()];
            const encodedTx = rlpEncode(extraData);
            this.transactions.set(hash, encodedTx);

            const receipt = tx.getReceipt();
            const encodedReceipt = receipt.serialize(true);
            this.transactionReceipts.set(hash, encodedReceipt);
          });
          block.value.transactions = blockData.blockTransactions;
          this.blocks.putBlock(block);
          return block;
        });

        lastBlock.then(block => {
          // emit the block once everything has been fully saved to the database
          this.emit("block", block);
        });
      });

      this.blocks.earliest = this.blocks.latest = await lastBlock;
      this.#state = Status.started;
      this.emit("start");
    });
  }

  #isPaused = () => {
    return (this.#state & Status.paused) !== 0;
  }

  pause() {
    this.#state |= Status.paused;
    this.emit("pause");
  }

  resume(threads: number = 1) {
    if (!this.#isPaused()) {
      console.log("Warning: startMining called when miner was already started");
      return;
    }
    // toggles the `paused` bit
    this.#state ^= Status.paused;
    this.emit("resume");
  }

  createVmFromStateTrie = (stateTrie: CheckpointTrie, hardfork: string, allowUnlimitedContractSize: boolean): any => {
    const common = Common.forCustomChain(
      "mainnet", // TODO needs to match chain id
      {
        name: "ganache",
        networkId: 1,
        chainId: 1,
        comment: "Local test network",
        bootstrapNodes: []
      },
      hardfork
    );
    const vm = new VM({
      state: stateTrie,
      activatePrecompiles: true,
      common,
      allowUnlimitedContractSize,
      blockchain: {
        getBlock: async (number: BN, done: any) => {
          const hash = await this.#blockNumberToHash(number);
          done(this.blocks.get(hash));
        }
      } as any
    });
    vm.on("step", this.emit.bind(this, "step"));
    return vm;
  };

  #initializeAccounts = async (accounts: Account[]): Promise<void> => {
    const stateManager = this.vm.stateManager;
    const putAccount = promisify(stateManager.putAccount.bind(stateManager));
    const checkpoint = promisify(stateManager.checkpoint.bind(stateManager));
    const commit = promisify(stateManager.commit.bind(stateManager));
    await checkpoint();
    const l = accounts.length;
    const pendingAccounts = Array(l);
    for (let i = 0; i < l; i++) {
      const account = accounts[i];
      const ethereumJsAccount = new EthereumJsAccount();
      (ethereumJsAccount.nonce = account.nonce.toBuffer()), (ethereumJsAccount.balance = account.balance.toBuffer());
      pendingAccounts[i] = putAccount(account.address.toBuffer(), ethereumJsAccount);
    }
    await Promise.all(pendingAccounts);
    await commit();
  };

  #initializeGenesisBlock = async (timestamp: number, blockGasLimit: Quantity): Promise<Block> => {
    // create the genesis block
    const genesis = this.blocks.next({
      // If we were given a timestamp, use it instead of the `_currentTime`
      timestamp,
      gasLimit: blockGasLimit.toBuffer(),
      stateRoot: this.trie.root,
      number: "0x0"
    });

    // store the genesis block in the database
    return this.blocks.putBlock(genesis);
  };

  #timeAdjustment: number = 0;

  #currentTime = () => {
    return Math.floor(Date.now() / 1000) + this.#timeAdjustment;
  };

  public increaseTime(seconds: number) {
    if (seconds < 0) {
      seconds = 0;
    }
    return this.#timeAdjustment += seconds;
  }
  
  public setTime(timestamp: number) {
    return this.#timeAdjustment = Math.floor((timestamp - Date.now()) / 1000);
  }

  /**
   * Given a block number, find its hash in the database
   * @param number
   */
  #blockNumberToHash = (number: BN): Promise<Buffer> => {
    return number.toString() as any;
  };

  public async queueTransaction(transaction: any, secretKey?: Data): Promise<Data> {
    await this.transactions.push(transaction, secretKey);
    return Data.from(transaction.hash());
  }

  public async simulateTransaction(transaction: any, parentBlock: Block, block: Block): Promise<Data> {
    // TODO: this is just a prototype implementation
    const vm = this.vm.copy();
    const stateManager = vm.stateManager;
    const settingStateRootProm = promisify(stateManager.setStateRoot.bind(stateManager))(
      parentBlock.value.header.stateRoot
    );
    transaction.block = block.value;
    transaction.caller = transaction.from;
    await settingStateRootProm;
    const result = await vm.runCall(transaction);
    return Data.from(result.execResult.returnValue || "0x");
  }

  /**
   * Gracefully shuts down the blockchain service and all of its dependencies.
   */
  public async stop() {
    // If the blockchain is still initalizing we don't want to shut down
    // yet because there may still be database calls in flight. Leveldb may
    // cause a segfault due to a race condition between a db write and the close
    // call.
    if (this.#state === Status.starting) {
      await new Promise(resolve => {
        this.on("start", resolve);
      });
    }
    if (this.#state === Status.started) {
      this.#state = Status.stopping;
      await this.#database.close();
      this.#state = Status.stopped;
    }
    this.emit("stop");
  }
}
