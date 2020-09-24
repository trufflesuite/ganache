import RuntimeError, { RETURN_TYPES } from "./things/runtime-error";
import Miner from "./miner";
import Database from "./database";
import Emittery from "emittery";
import BlockManager, {Block} from "./components/block-manager";
import BlockLogs from "./things/blocklogs";
import TransactionManager from "./components/transaction-manager";
import CheckpointTrie from "merkle-patricia-tree";
import {BN} from "ethereumjs-util";
import Account from "./things/account";
import {promisify} from "util";
import {Quantity, Data} from "@ganache/utils";
import EthereumJsAccount from "ethereumjs-account";
import AccountManager from "./components/account-manager";
import {utils} from "@ganache/utils";
import Transaction from "./things/transaction";
import Manager from "./components/manager";
import TransactionReceipt from "./things/transaction-receipt";
import {encode as rlpEncode} from "rlp";
import Common from "ethereumjs-common";
import {Block as EthereumBlock} from "ethereumjs-block";
import VM from "ethereumjs-vm";
import Address from "./things/address";
import BlockLogManager from "./components/blocklog-manager";
import RejectionError from "./things/rejection-error";
import { EVMResult } from "ethereumjs-vm/dist/evm/evm";
import { VmError, ERROR } from "ethereumjs-vm/dist/exceptions";
import { EthereumInternalOptions } from "./options";


type SimulationTransaction = {
  /**
   * The address the transaction is sent from.
   */
  from: Address,
  /**
   * The address the transaction is directed to.
   */
  to?: Address,
  /**
   * Integer of the gas provided for the transaction execution. eth_call consumes zero gas, but this parameter may be needed by some executions.
   */
  gas: Quantity,
  /**
   * Integer of the gasPrice used for each paid gas
   */
  gasPrice: Quantity,
  /**
   * Integer of the value sent with this transaction
   */
  value?: Quantity,
  /**
   * Hash of the method signature and encoded parameters. For details see Ethereum Contract ABI in the Solidity documentation
   */
  data?: Data,
  block: Block
}

const unref = utils.unref;

export enum Status {
  // Flags
  started = 1,		// 0000 0001
  starting = 2,		// 0000 0010
  stopped = 4,		// 0000 0100
  stopping = 8,		// 0000 1000
  paused = 16			// 0001 0000
}

type BlockchainTypedEvents = {block: Block, blockLogs: BlockLogs, pendingTransaction: Transaction};
type BlockchainEvents = "start" | "stop" | "step";

export default class Blockchain extends Emittery.Typed<BlockchainTypedEvents, BlockchainEvents> {
  #state: Status = Status.starting;
  #miner: Miner;
  #processingBlock: Promise<{block: Block, blockLogs: BlockLogs}>;
  public blocks: BlockManager;
  public blockLogs: BlockLogManager;
  public transactions: TransactionManager;
  public transactionReceipts: Manager<TransactionReceipt>;
  public accounts: AccountManager;
  public vm: VM;
  public trie: CheckpointTrie;
  readonly #database: Database;
  readonly #common: Common;
  readonly #options: EthereumInternalOptions;
  readonly #instamine: boolean;

  /**
   * Initializes the underlying Database and handles synchronization between
   * the API and the database.
   *
   * Emits a `ready` event once the database and all dependencies are fully
   * initialized.
   * @param options
   */
  constructor(options: EthereumInternalOptions, common: Common, initialAccounts: Account[], coinbaseAddress: Address) {
    super();
    this.#options = options;
    this.#common = common;

    const instamine = this.#instamine = !options.miner.blockTime || options.miner.blockTime <= 0;
    const legacyInstamine = options.miner.legacyInstamine;

    { // warnings
      if (legacyInstamine) {
        console.warn("Legacy instamining, where transactions are fully mined before the hash is returned, is deprecated and will be removed in the future.");
      }

      if (instamine === false) {
        if (legacyInstamine === true) {
          console.warn("Setting `legacyInstamine` to `true` has no effect when blockTime is 0 (default)");
        }

        if (options.chain.vmErrorsOnRPCResponse) {
          console.warn("Setting `vmErrorsOnRPCResponse` to `true` has no effect on transactions when blockTime is 0 (default)");
        }
      }
    }

    const database = (this.#database = new Database(options.database, this));
    database.once("ready").then(async () => {
      const blocks = this.blocks = await BlockManager.initialize(common, database.blockIndexes, database.blocks);

      // if we have a latest block, use it to set up the trie.
      const latest = blocks.latest;
      if (latest) {
        this.#processingBlock = Promise.resolve({block: latest, blockLogs: null});
        this.trie = new CheckpointTrie(database.trie, latest.value.header.stateRoot);
      } else {
        this.trie = new CheckpointTrie(database.trie, null);
      }
      
      this.blockLogs = new BlockLogManager(database.blockLogs);
      this.transactions = new TransactionManager(options.miner, common, this, database.transactions);
      this.transactionReceipts = new Manager(
        database.transactionReceipts,
        TransactionReceipt
      );
      this.accounts = new AccountManager(this, database.trie);

      this.coinbase = coinbaseAddress;

      // create VM and listen to step events
      this.vm = this.createVmFromStateTrie(this.trie, options.chain.allowUnlimitedContractSize);
      this.vm.on("step", this.emit.bind(this, "step"));

      await this.#commitAccounts(initialAccounts);

      const gasLimit = options.miner.blockGasLimit = options.miner.blockGasLimit;

      { // create first block
        let firstBlockTime: number;
        if (options.chain.time != null) {
          const t = +options.chain.time;
          firstBlockTime = Math.floor(t / 1000);
          this.setTime(t);
        } else {
          firstBlockTime = this.#currentTime();
        }

        // if we don't already have a latest block, create a genesis block!
        if (!latest) {
          this.#processingBlock = this.#initializeGenesisBlock(firstBlockTime, gasLimit);
          blocks.earliest = blocks.latest = await this.#processingBlock.then(({block}) => block);
        }
      }

      { // configure and start miner
        const logger = options.logging.logger;

        const miner = this.#miner = new Miner(options.miner, instamine, this.vm, this.#readyNextBlock);

        { // automatic mining
          const mineAll = async () => this.#isPaused() ? null : this.mine(1);
          if (instamine) {
            // whenever the transaction pool is drained mine the txs into blocks
            this.transactions.transactionPool.on("drain", mineAll);
          } else {
            const wait = () => unref(setTimeout(mineNext, options.miner.blockTime * 1000));
            const mineNext = () => mineAll().then(wait);
            wait();
          }
        }

        miner.on("transaction-failure", (failureData: any) => {
          const txHash = Data.from(failureData.txHash, 32).toString();
          return this.emit("transaction:" + txHash as any, new RejectionError(txHash.toString(), failureData.errorMessage));
        });

        miner.on("block", async (blockData: any) => {
          await this.#processingBlock;
          const previousBlock = blocks.latest;
          const previousHeader = previousBlock.value.header;
          const previousNumber = Quantity.from(previousHeader.number).toBigInt() || 0n;
          const block = blocks.createBlock({
            parentHash: previousHeader.hash(),
            number: Quantity.from(previousNumber + 1n).toBuffer(),
            coinbase: this.coinbase.toBuffer(),
            timestamp: blockData.timestamp,
            // difficulty:
            gasLimit: options.miner.blockGasLimit.toBuffer(),
            transactionsTrie: blockData.transactionsTrie.root,
            receiptTrie: blockData.receiptTrie.root,
            stateRoot: this.trie.root,
            gasUsed: Quantity.from(blockData.gasUsed).toBuffer()
          });

          blocks.latest = block;
          const value = block.value;
          const header = value.header;
          this.#processingBlock = database.batch(() => {
            const blockHash = value.hash();
            const blockNumber = header.number;
            const blockNumberQ = Quantity.from(blockNumber);
            const blockLogs = BlockLogs.create(blockHash);
            const timestamp = new Date(Quantity.from(header.timestamp).toNumber() * 1000).toString();
            blockData.blockTransactions.forEach((tx: Transaction, i: number) => {
              const hash = tx.hash();
              // TODO: clean up transaction extra data stuffs because this is gross:
              const extraData = [...tx.raw, blockHash, blockNumber, Quantity.from(i).toBuffer(), Buffer.from([tx.type]), tx.from];
              const encodedTx = rlpEncode(extraData);
              this.transactions.set(hash, encodedTx);

              const receipt = tx.getReceipt();
              const encodedReceipt = receipt.serialize(true);
              this.transactionReceipts.set(hash, encodedReceipt);

              tx.getLogs().forEach(log => {
                blockLogs.append(
                  Quantity.from(i).toBuffer(),
                  hash,
                  log
                );
              });

              logger.log("");
              logger.log("  Transaction: " + Data.from(hash));

              const contractAddress = receipt.contractAddress;
              if (contractAddress != null) {
                logger.log("  Contract created: " + Address.from(contractAddress));
              }

              const raw = receipt.raw;
              logger.log("  Gas usage: " + Quantity.from(raw[1]));
              logger.log("  Block Number: " + blockNumberQ);
              logger.log("  Block Time: " + timestamp);

              const error = tx.execException;
              if (error) {
                logger.log("  Runtime Error: " + error.data.message);
                if ((error as any).reason) {
                  logger.log("  Revert reason: " + (error as any).data.reason);
                }
              }

              logger.log("");
            });
            blockLogs.blockNumber = blockNumberQ;
            this.blockLogs.set(blockNumber, blockLogs.serialize());
            value.transactions = blockData.blockTransactions;
            blocks.putBlock(block);
            return {block, blockLogs};
          });

          return this.#processingBlock.then(({block, blockLogs}) => {
            blocks.latest = block;

            if (instamine && options.miner.legacyInstamine) {
              block.value.transactions.forEach(transaction => {
                const error = options.chain.vmErrorsOnRPCResponse ? transaction.execException : null
                this.emit("transaction:" + Data.from(transaction.hash(), 32).toString() as any, error);
              });

              // in legacy instamine mode we must delay the broadcast of new blocks
              process.nextTick(() => {
                // emit the block once everything has been fully saved to the database
                this.emit("block", block);
                this.emit("blockLogs", blockLogs);
              });
            } else {
              this.emit("block", block);
              this.emit("blockLogs", blockLogs);
            }
          });
        });

        this.once("stop").then(() => miner.clearListeners());
      }

      this.#state = Status.started;
      this.emit("start");
    });
  }

  coinbase: Address;

  #readyNextBlock = (previousBlock: EthereumBlock, timestamp?: number) => {
    const previousHeader = previousBlock.header;
    const previousNumber = Quantity.from(previousHeader.number).toBigInt() || 0n;
    return this.blocks.createBlock({
      number: Quantity.from(previousNumber + 1n).toBuffer(),
      gasLimit: this.#options.miner.blockGasLimit.toBuffer(),
      timestamp: timestamp == null ? this.#currentTime(): timestamp,
      parentHash: previousHeader.hash()
    }).value;
  }

  isMining = () => {
    return this.#state === Status.started;
  }

  mine = async (maxTransactions: number, timestamp?: number, onlyOneBlock: boolean = false) => {
    await this.#processingBlock;
    const nextBlock = this.#readyNextBlock(this.blocks.latest.value, timestamp);
    return this.#miner.mine(this.transactions.transactionPool.executables, nextBlock, maxTransactions, onlyOneBlock);
  }

  #isPaused = () => {
    return (this.#state & Status.paused) !== 0;
  }

  pause() {
    this.#state |= Status.paused;
  }

  resume(_threads: number = 1) {
    if (!this.#isPaused()) {
      console.log("Warning: startMining called when miner was already started");
      return;
    }

    // toggles the `paused` bit
    this.#state ^= Status.paused;

    // if we are instamining mine a block right away
    if (this.#instamine) {
      return this.mine(-1);
    }
  }

  createVmFromStateTrie = (stateTrie: CheckpointTrie, allowUnlimitedContractSize: boolean): any => {
    const blocks = this.blocks;
    // ethereumjs vm doesn't use the callback style anymore
    const getBlock = class T {
      static async [promisify.custom] (number: BN) {
        const block = await blocks.get(number.toBuffer()).catch(_ => null);
        return block ? block.value : null;
      }
    };

    return new VM({
      state: stateTrie,
      activatePrecompiles: true,
      common: this.#common,
      allowUnlimitedContractSize,
      blockchain: {
        getBlock
      } as any
    });
  };

  #commitAccounts = async (accounts: Account[]): Promise<void> => {
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

  #initializeGenesisBlock = async (timestamp: number, blockGasLimit: Quantity) => {
    // create the genesis block
    const genesis = this.blocks.next({
      // If we were given a timestamp, use it instead of the `_currentTime`
      timestamp,
      gasLimit: blockGasLimit.toBuffer(),
      stateRoot: this.trie.root,
      number: "0x0"
    });

    // store the genesis block in the database
    return this.blocks.putBlock(genesis).then(block => ({block, blockLogs: BlockLogs.create(block.value.hash())}));
  };

  #timeAdjustment: number = 0;

  /**
   * Returns the timestamp, adjusted by the timeAdjustent offset, in seconds.
   */
  #currentTime = () => {
    return Math.floor((Date.now() + this.#timeAdjustment) / 1000);
  };

  /**
   * @param seconds
   * @returns the total time offset *in milliseconds*
   */
  public increaseTime(seconds: number) {
    if (seconds < 0) {
      seconds = 0;
    }
    return this.#timeAdjustment += seconds;
  }
  
  /**
   * @param seconds
   * @returns the total time offset *in milliseconds*
   */
  public setTime(timestamp: number) {
    return this.#timeAdjustment = timestamp - Date.now();
  }

  // TODO(perf): this.#snapshots is a potential unbound memory suck. Caller could call `evm_snapshot` over and over
  // to grow the snapshot stack indefinitely
  #snapshots: any[] = [];
  public snapshot() {
    const currentBlockHeader = this.blocks.latest.value.header;
    const hash = currentBlockHeader.hash();
    const stateRoot = currentBlockHeader.stateRoot;

    // TODO: logger.log...
    // self.logger.log("Saved snapshot #" + self.snapshots.length);
    
    return this.#snapshots.push({
      hash,
      stateRoot,
      timeAdjustment: this.#timeAdjustment
    });
  }

  #deleteBlockData = (block: Block) => {
    const blocks = this.blocks;
    return this.#database.batch(() => {
      blocks.del(block.value.header.number);
      blocks.del(block.value.header.hash());
      this.blockLogs.del(block.value.header.number);
      block.value.transactions.forEach(tx => {
        const txHash = tx.hash();
        this.transactions.del(txHash);
        this.transactionReceipts.del(txHash);
      });
    });
  }
  public async revert(snapshotId: Quantity) {

    const rawValue = snapshotId.valueOf();
    if (rawValue === null || rawValue === undefined) {
      throw new Error("invalid snapshotId");
    }

    // TODO: logger.log...
    // this.logger.log("Reverting to snapshot #" + snapshotId);

    const snapshotNumber = rawValue - 1n;
    if (snapshotNumber < 0n) {
      return false;
    }

    const snapshotsToRemove = this.#snapshots.splice(Number(snapshotNumber));
    const snapshot = snapshotsToRemove.shift();

    if (!snapshot) {
      return false;
    }

    const blocks = this.blocks;
    const currentBlock = blocks.latest;
    const currentHash = currentBlock.value.header.hash();
    const snapshotHash = snapshot.hash;

    // if nothing was added since we snapshotted just return immediately.
    if (currentHash.equals(snapshotHash)) {
      return true;
    } else {
      const stateManager = this.vm.stateManager;
      // TODO: we may need to ensure nothing can be written to the blockchain
      // whilst setting the state root, otherwise we could get into weird states.
      // Additionally, if something has created a vm checkpoint `setStateRoot`
      // will fail anyway.
      const settingStateRootProm = promisify(stateManager.setStateRoot.bind(stateManager))(
        snapshot.stateRoot
      );
      const getBlockProm = this.blocks.getByHash(snapshotHash);

      // TODO(perf): lazily clean up the database. Get all blocks created since our reverted
      // snapshot was created, and delete them, and their transaction data.
      // TODO(perf): look into optimizing this to delete from all reverted snapshots.
      //   the current approach looks at each block, finds its parent, then
      //   finds its parent, and so on until we reach our target block. Whenever
      //   we revert a snapshot, we may also throwing away several others, and
      //   there may be an optimization here by querying for those other
      //   snapshots' blocks simultaneously.
      let nextBlock = currentBlock;
      const promises = [getBlockProm, settingStateRootProm] as [Promise<Block>, ...Promise<unknown>[]];
      do {
        promises.push(this.#deleteBlockData(nextBlock));
        const header = nextBlock.value.header
        if (header.parentHash.equals(snapshotHash)) {
          break;
        } else {
          nextBlock = await blocks.getByHash(header.parentHash);
        }
      } while(nextBlock);

      const [latest] = await Promise.all(promises);
      this.blocks.latest = latest as Block;
      // put our time back!
      this.#timeAdjustment = snapshot.timeAdjustment;
      // update our cached "latest" block
      return true;
    }
  }

  public async queueTransaction(transaction: any, secretKey?: Data) {
    // NOTE: this.transactions.push *must* be awaited before returning the
    // `transaction.hash()`, as the transactionPool may change the transaction
    // (and thus its hash!)
    // It may also throw Errors that must be returned to the caller.
    if ( (await this.transactions.push(transaction, secretKey) === true) ) {
      process.nextTick(this.emit.bind(this), "pendingTransaction", transaction);
    }

    const hash = Data.from(transaction.hash(), 32);
    if (this.#isPaused() || !this.#instamine) {
      return hash;
    } else {
      if (this.#instamine && this.#options.miner.legacyInstamine) {
        const hashStr = hash.toString();
        const error = await this.once("transaction:" + hashStr as any);
        if (error) {
          throw error;
        }
      }
      return hash;
    }
  }

  public async simulateTransaction(transaction: SimulationTransaction, parentBlock: Block) {
    let result: EVMResult;
    const options = this.#options;

    const data = transaction.data;
    let gasLeft = transaction.gas.toBigInt();
    // subtract out the transaction's base fee from the gas limit before
    // simulating the tx, because `runCall` doesn't account for raw gas costs.
    gasLeft -= Transaction.calculateIntrinsicGas(data ? data.toBuffer() : null, options.chain.hardfork);

    if (gasLeft >= 0) {
      const stateTrie = new CheckpointTrie(this.#database.trie, parentBlock.value.header.stateRoot);
      const vm = this.createVmFromStateTrie(stateTrie, this.vm.allowUnlimitedContractSize);
      vm.on("step", this.emit.bind(this, "step"));

      result = await vm.runCall({
        caller: transaction.from.toBuffer(),
        data: transaction.data && transaction.data.toBuffer(),
        gasPrice: transaction.gasPrice.toBuffer(),
        gasLimit: Quantity.from(gasLeft).toBuffer(),
        to: transaction.to && transaction.to.toBuffer(),
        value: transaction.value && transaction.value.toBuffer(),
        block: transaction.block.value
      });
    } else {
      result = {execResult: {runState: {programCounter: 0}, exceptionError: new VmError(ERROR.OUT_OF_GAS), returnValue: Buffer.allocUnsafe(0)}} as any;
    }
    if (result.execResult.exceptionError) {
      if (this.#options.chain.vmErrorsOnRPCResponse) {
        // eth_call transactions don't really have a transaction hash
        const hash = Buffer.allocUnsafe(0);
        throw new RuntimeError(hash, result, RETURN_TYPES.RETURN_VALUE);
      } else {
        return Data.from(result.execResult.returnValue || "0x");
      }
    } else {
      return Data.from(result.execResult.returnValue || "0x");
    }
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
      await this.once("start");
    }

    // clean up listeners
    this.vm.removeAllListeners();
    this.transactions.transactionPool.clearListeners();
    await this.emit("stop");

    if (this.#state === Status.started) {
      this.#state = Status.stopping;
      await this.#database.close();
      this.#state = Status.stopped;
    }
  }
}
