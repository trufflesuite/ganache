import { EOL } from "os";
import Miner from "./miner/miner";
import Database from "./database";
import Emittery from "emittery";
import BlockManager from "./data-managers/block-manager";
import {
  BlockLogs,
  Account,
  Transaction,
  TransactionReceipt,
  Address,
  RuntimeBlock,
  Block,
  ITraceData,
  TraceDataFactory,
  TraceStorageMap,
  RuntimeError,
  RETURN_TYPES,
  Snapshots,
  StepEvent,
  StorageKeys,
  StorageRangeResult,
  StorageRecords,
  RangedStorageKeys
} from "@ganache/ethereum-utils";
import TransactionManager from "./data-managers/transaction-manager";
import SecureTrie from "merkle-patricia-tree/secure";
import { BN, KECCAK256_RLP } from "ethereumjs-util";
import { promisify } from "util";
import { Quantity, Data, utils } from "@ganache/utils";
import AccountManager from "./data-managers/account-manager";
import Manager from "./data-managers/manager";
import { encode as rlpEncode, decode as rlpDecode } from "rlp";
import Common from "ethereumjs-common";
import VM from "ethereumjs-vm";
import BlockLogManager from "./data-managers/blocklog-manager";
import { EVMResult } from "ethereumjs-vm/dist/evm/evm";
import { VmError, ERROR } from "ethereumjs-vm/dist/exceptions";
import { EthereumInternalOptions } from "@ganache/ethereum-options";

const {
  BUFFER_EMPTY,
  RPCQUANTITY_EMPTY,
  BUFFER_32_ZERO,
  BUFFER_256_ZERO,
  RPCQUANTITY_ZERO,
  findInsertPosition
} = utils;

type SimulationTransaction = {
  /**
   * The address the transaction is sent from.
   */
  from: Address;
  /**
   * The address the transaction is directed to.
   */
  to?: Address;
  /**
   * Integer of the gas provided for the transaction execution. eth_call consumes zero gas, but this parameter may be needed by some executions.
   */
  gas: Quantity;
  /**
   * Integer of the gasPrice used for each paid gas
   */
  gasPrice: Quantity;
  /**
   * Integer of the value sent with this transaction
   */
  value?: Quantity;
  /**
   * Hash of the method signature and encoded parameters. For details see Ethereum Contract ABI in the Solidity documentation
   */
  data?: Data;
  block: RuntimeBlock;
};

const unref = utils.unref;

export enum Status {
  // Flags
  started = 1, // 0000 0001
  starting = 2, // 0000 0010
  stopped = 4, // 0000 0100
  stopping = 8, // 0000 1000
  paused = 16 // 0001 0000
}

type BlockchainTypedEvents = {
  block: Block;
  blockLogs: BlockLogs;
  pendingTransaction: Transaction;
};
type BlockchainEvents = "start" | "stop";

export type TransactionTraceOptions = {
  disableStorage?: boolean;
  disableMemory?: boolean;
  disableStack?: boolean;
};

export type StructLog = {
  depth: number;
  error: string;
  gas: number;
  gasCost: number;
  memory: Array<ITraceData>;
  op: string;
  pc: number;
  stack: Array<ITraceData>;
  storage: TraceStorageMap;
};

interface Logger {
  log(message?: any, ...optionalParams: any[]): void;
}

export type BlockchainOptions = {
  db?: string | object;
  db_path?: string;
  initialAccounts?: Account[];
  hardfork?: string;
  allowUnlimitedContractSize?: boolean;
  gasLimit?: Quantity;
  time?: Date;
  blockTime?: number;
  coinbase: Account;
  chainId: number;
  common: Common;
  legacyInstamine: boolean;
  vmErrorsOnRPCResponse: boolean;
  logger: Logger;
};

/**
 * Sets the provided VM state manager's state root *without* first
 * checking for checkpoints or flushing the existing cache.
 *
 * Useful if you know the state manager is not in a checkpoint and its internal
 * cache is safe to discard.
 *
 * @param stateManager
 * @param stateRoot
 */
function setStateRootSync(stateManager: VM["stateManager"], stateRoot: Buffer) {
  stateManager._trie.root = stateRoot;
  stateManager._cache.clear();
  stateManager._storageTries = {};
}

export default class Blockchain extends Emittery.Typed<
  BlockchainTypedEvents,
  BlockchainEvents
> {
  #state: Status = Status.starting;
  #miner: Miner;
  #blockBeingSavedPromise: Promise<{ block: Block; blockLogs: BlockLogs }>;
  public blocks: BlockManager;
  public blockLogs: BlockLogManager;
  public transactions: TransactionManager;
  public transactionReceipts: Manager<TransactionReceipt>;
  public storageKeys: Database["storageKeys"];
  public accounts: AccountManager;
  public vm: VM;
  public trie: SecureTrie;

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
  constructor(
    options: EthereumInternalOptions,
    common: Common,
    coinbaseAddress: Address
  ) {
    super();
    this.#options = options;
    this.#common = common;

    const instamine = (this.#instamine =
      !options.miner.blockTime || options.miner.blockTime <= 0);
    const legacyInstamine = options.miner.legacyInstamine;

    {
      // warnings and errors
      if (legacyInstamine) {
        console.info(
          "Legacy instamining, where transactions are fully mined before the hash is returned, is deprecated and will be removed in the future."
        );
      }

      if (!instamine) {
        if (legacyInstamine) {
          console.info(
            "Setting `legacyInstamine` to `true` has no effect when blockTime is non-zero"
          );
        }

        if (options.chain.vmErrorsOnRPCResponse) {
          console.info(
            "Setting `vmErrorsOnRPCResponse` to `true` has no effect on transactions when blockTime is non-zero"
          );
        }
      }
    }

    this.coinbase = coinbaseAddress;

    this.#database = new Database(options.database, this);
  }

  async initialize(initialAccounts: Account[]) {
    const database = this.#database;
    const options = this.#options;
    const common = this.#common;

    await database.initialize();

    const blocks = (this.blocks = await BlockManager.initialize(
      common,
      database.blockIndexes,
      database.blocks
    ));

    // if we have a latest block, use it to set up the trie.
    const latest = blocks.latest;
    if (latest) {
      this.#blockBeingSavedPromise = Promise.resolve({
        block: latest,
        blockLogs: null
      });
      this.trie = new SecureTrie(
        database.trie,
        latest.header.stateRoot.toBuffer()
      );
    } else {
      this.trie = new SecureTrie(database.trie, null);
    }

    this.blockLogs = new BlockLogManager(database.blockLogs);
    this.transactions = new TransactionManager(
      options.miner,
      common,
      this,
      database.transactions
    );
    this.transactionReceipts = new Manager(
      database.transactionReceipts,
      TransactionReceipt
    );
    this.accounts = new AccountManager(this, database.trie);
    this.storageKeys = database.storageKeys;

    // create VM and listen to step events
    this.vm = this.createVmFromStateTrie(
      this.trie,
      options.chain.allowUnlimitedContractSize
    );

    {
      // create first block
      let firstBlockTime: number;
      if (options.chain.time != null) {
        // If we were given a timestamp, use it instead of the `_currentTime`
        const t = options.chain.time.getTime();
        firstBlockTime = Math.floor(t / 1000);
        this.setTime(t);
      } else {
        firstBlockTime = this.#currentTime();
      }

      // if we don't already have a latest block, create a genesis block!
      if (!latest) {
        if (initialAccounts.length > 0) {
          await this.#commitAccounts(initialAccounts);
        }

        this.#blockBeingSavedPromise = this.#initializeGenesisBlock(
          firstBlockTime,
          options.miner.blockGasLimit
        );
        blocks.earliest = blocks.latest = await this.#blockBeingSavedPromise.then(
          ({ block }) => block
        );
      }
    }

    {
      // configure and start miner
      const txPool = this.transactions.transactionPool;
      const minerOpts = options.miner;
      const miner = (this.#miner = new Miner(
        minerOpts,
        txPool.executables,
        this.#instamine,
        this.vm,
        this.#readyNextBlock
      ));

      //#region automatic mining
      const nullResolved = Promise.resolve(null);
      const mineAll = (maxTransactions: number) =>
        this.#isPaused() ? nullResolved : this.mine(maxTransactions);
      if (this.#instamine) {
        // insta mining
        // whenever the transaction pool is drained mine the txs into blocks
        txPool.on("drain", mineAll.bind(null, 1));
      } else {
        // interval mining
        const wait = () => unref(setTimeout(next, minerOpts.blockTime * 1e3));
        const next = () => mineAll(-1).then(wait);
        wait();
      }
      //#endregion

      miner.on("block", this.#handleNewBlockData);

      this.once("stop").then(() => miner.clearListeners());
    }

    this.#state = Status.started;
    this.emit("start");
  }

  #saveNewBlock = ({
    block,
    serialized,
    storageKeys
  }: {
    block: Block;
    serialized: Buffer;
    storageKeys: StorageKeys;
  }) => {
    const { blocks } = this;
    blocks.latest = block;
    return this.#database.batch(() => {
      const blockHash = block.hash().toBuffer();
      const blockHeader = block.header;
      const blockNumberQ = blockHeader.number;
      const blockNumber = blockHeader.number.toBuffer();
      const blockLogs = BlockLogs.create(blockHash);
      const timestamp = new Date(
        blockHeader.timestamp.toNumber() * 1000
      ).toString();
      const logOutput: string[] = [];
      block.getTransactions().forEach((tx: Transaction, i: number) => {
        const hash = tx.hash();
        const index = Quantity.from(i).toBuffer();
        const txAndExtraData = [
          ...tx.raw,
          blockHash,
          blockNumber,
          index,
          Buffer.from([tx.type]),
          tx.from
        ];
        const encodedTx = rlpEncode(txAndExtraData);
        this.transactions.set(hash, encodedTx);

        const receipt = tx.getReceipt();
        const encodedReceipt = receipt.serialize(true);
        this.transactionReceipts.set(hash, encodedReceipt);

        tx.getLogs().forEach(blockLogs.append.bind(blockLogs, index, hash));

        logOutput.push(
          this.#getTransactionLogOutput(
            hash,
            receipt,
            blockNumberQ,
            timestamp,
            tx.execException
          )
        );
      });

      // save storage keys to the database
      storageKeys.forEach(value => {
        this.storageKeys.put(value.hashedKey, value.key);
      });

      blockLogs.blockNumber = blockNumberQ;
      this.blockLogs.set(blockNumber, blockLogs.serialize());
      blocks.putBlock(blockNumber, blockHash, serialized);
      this.#options.logging.logger.log(logOutput.join(EOL));
      return { block, blockLogs };
    });
  };

  #emitNewBlock = async (blockInfo: { block: Block; blockLogs: BlockLogs }) => {
    const options = this.#options;
    const { block, blockLogs } = blockInfo;

    // emit the block once everything has been fully saved to the database
    block.getTransactions().forEach(transaction => {
      transaction.finalize("confirmed", transaction.execException);
    });

    if (this.#instamine && options.miner.legacyInstamine) {
      // in legacy instamine mode we must delay the broadcast of new blocks
      await new Promise(resolve => {
        process.nextTick(async () => {
          // emit block logs first so filters can pick them up before
          // block listeners are notified
          await Promise.all([
            this.emit("blockLogs", blockLogs),
            this.emit("block", block)
          ]);
          resolve(void 0);
        });
      });
    } else {
      // emit block logs first so filters can pick them up before
      // block listeners are notified
      await Promise.all([
        this.emit("blockLogs", blockLogs),
        this.emit("block", block)
      ]);
    }

    return blockInfo;
  };

  #getTransactionLogOutput = (
    hash: Buffer,
    receipt: TransactionReceipt,
    blockNumber: Quantity,
    timestamp: string,
    error: RuntimeError | undefined
  ) => {
    let str = `${EOL}  Transaction: ${Data.from(hash)}${EOL}`;

    const contractAddress = receipt.contractAddress;
    if (contractAddress != null) {
      str += `  Contract created: ${Address.from(contractAddress)}${EOL}`;
    }

    str += `  Gas usage: ${Quantity.from(receipt.raw[1]).toNumber()}${EOL}
  Block number: ${blockNumber.toNumber()}${EOL}
  Block time: ${timestamp}${EOL}`;

    if (error) {
      str += `  Runtime error: ${error.data.message}${EOL}`;
      if (error.data.reason) {
        str += `  Revert reason: ${error.data.reason}${EOL}`;
      }
    }

    return str;
  };

  #handleNewBlockData = async (blockData: {
    block: Block;
    serialized: Buffer;
    storageKeys: StorageKeys;
  }) => {
    this.#blockBeingSavedPromise = this.#blockBeingSavedPromise
      .then(() => this.#saveNewBlock(blockData))
      .then(this.#emitNewBlock);

    return this.#blockBeingSavedPromise;
  };

  coinbase: Address;

  #readyNextBlock = (previousBlock: Block, timestamp?: number) => {
    const previousHeader = previousBlock.header;
    const previousNumber = previousHeader.number.toBigInt() || 0n;
    return new RuntimeBlock(
      Quantity.from(previousNumber + 1n),
      previousBlock.hash(),
      this.coinbase,
      this.#options.miner.blockGasLimit.toBuffer(),
      Quantity.from(timestamp == null ? this.#currentTime() : timestamp),
      this.#options.miner.difficulty,
      previousBlock.header.totalDifficulty
    );
  };

  isStarted = () => {
    return this.#state === Status.started;
  };

  mine = async (
    maxTransactions: number,
    timestamp?: number,
    onlyOneBlock: boolean = false
  ) => {
    await this.#blockBeingSavedPromise;
    const nextBlock = this.#readyNextBlock(this.blocks.latest, timestamp);
    return this.#miner.mine(nextBlock, maxTransactions, onlyOneBlock);
  };

  #isPaused = () => {
    return (this.#state & Status.paused) !== 0;
  };

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

  createVmFromStateTrie = (
    stateTrie: SecureTrie,
    allowUnlimitedContractSize: boolean
  ) => {
    const blocks = this.blocks;
    // ethereumjs vm doesn't use the callback style anymore
    const getBlock = class T {
      static async [promisify.custom](number: BN) {
        const block = await blocks.get(number.toBuffer()).catch(_ => null);
        return block ? { hash: () => block.hash().toBuffer() } : null;
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

  getFromTrie = (trie: SecureTrie, address: Buffer): Promise<Buffer> =>
    new Promise((resolve, reject) => {
      trie.get(address, (err, data) => {
        if (err) return void reject(err);
        resolve(data);
      });
    });

  #commitAccounts = (accounts: Account[]) => {
    return new Promise<void>((resolve, reject) => {
      let length = accounts.length;
      const cb = (err: Error) => {
        if (err) reject(err);
        else {
          if (--length === 0) resolve(void 0);
        }
      };
      for (let i = 0; i < length; i++) {
        const account = accounts[i];
        this.trie.put(account.address.toBuffer(), account.serialize(), cb);
      }
    });
  };

  #initializeGenesisBlock = async (
    timestamp: number,
    blockGasLimit: Quantity
  ) => {
    // README: block `0` is weird in that a `0` _should_ be hashed as `[]`,
    // instead of `[0]`, so we set it to `RPCQUANTITY_EMPTY` instead of
    // `RPCQUANTITY_ZERO` here. A few lines down in this function we swap
    // this `RPCQUANTITY_EMPTY` for `RPCQUANTITY_ZERO`. This is all so we don't
    // have to have a "treat empty as 0` check in every function that uses the
    // "latest" block (which this genesis block will be for breif moment).
    const rawBlockNumber = RPCQUANTITY_EMPTY;

    // create the genesis block
    const genesis = new RuntimeBlock(
      rawBlockNumber,
      Quantity.from(BUFFER_32_ZERO),
      this.coinbase,
      blockGasLimit.toBuffer(),
      Quantity.from(timestamp),
      this.#options.miner.difficulty,
      RPCQUANTITY_ZERO // we start the totalDifficulty at 0
    );

    // store the genesis block in the database
    const { block, serialized } = genesis.finalize(
      KECCAK256_RLP,
      KECCAK256_RLP,
      BUFFER_256_ZERO,
      this.trie.root,
      BUFFER_EMPTY,
      this.#options.miner.extraData,
      [],
      new Map()
    );
    // README: set the block number to an actual 0 now.
    block.header.number = RPCQUANTITY_ZERO;
    const hash = block.hash().toBuffer();
    return this.blocks
      .putBlock(block.header.number.toBuffer(), hash, serialized)
      .then(_ => ({
        block,
        blockLogs: BlockLogs.create(hash)
      }));
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
    return (this.#timeAdjustment += seconds);
  }

  /**
   * @param seconds
   * @returns the total time offset *in milliseconds*
   */
  public setTime(timestamp: number) {
    return (this.#timeAdjustment = timestamp - Date.now());
  }

  #deleteBlockData = (blocksToDelete: Block[]) => {
    return this.#database.batch(() => {
      const { blocks, transactions, transactionReceipts, blockLogs } = this;
      blocksToDelete.forEach(value => {
        value.getTransactions().forEach(tx => {
          const txHash = tx.hash();
          transactions.del(txHash);
          transactionReceipts.del(txHash);
        });
        const blockNum = value.header.number.toBuffer();
        blocks.del(blockNum);
        blocks.del(value.hash().toBuffer());
        blockLogs.del(blockNum);
      });
    });
  };

  // TODO(stability): this.#snapshots is a potential unbound memory suck. Caller
  // could call `evm_snapshot` over and over to grow the snapshot stack
  // indefinitely. `this.#snapshots.blocks` is even worse. To solve this we
  // might need to store in the db. An unlikely real problem, but possible.
  #snapshots: Snapshots = {
    snaps: [],
    blocks: null,
    unsubscribeFromBlocks: null
  };

  public snapshot() {
    const snapshots = this.#snapshots;
    const snaps = snapshots.snaps;

    // Subscription ids are based on the number of active snapshots. Weird? Yes.
    // But it's the way it's been since the beginning so it just hasn't been
    // changed. Feel free to change it so ids are unique if it bothers you
    // enough.
    const id = snaps.push({
      block: this.blocks.latest,
      timeAdjustment: this.#timeAdjustment
    });

    // start listening to new blocks if this is the first snapshot
    if (id === 1) {
      snapshots.unsubscribeFromBlocks = this.on("block", block => {
        snapshots.blocks = {
          current: block.hash().toBuffer(),
          next: snapshots.blocks
        };
      });
    }

    this.#options.logging.logger.log("Saved snapshot #" + id);

    return id;
  }

  public async revert(snapshotId: Quantity) {
    const rawValue = snapshotId.valueOf();
    if (rawValue === null || rawValue === undefined) {
      throw new Error("invalid snapshotId");
    }

    this.#options.logging.logger.log("Reverting to snapshot #" + snapshotId);

    // snapshot ids can't be < 1, so we do a quick sanity check here
    if (rawValue < 1n) {
      return false;
    }

    const snapshots = this.#snapshots;
    const snaps = snapshots.snaps;
    const snapshotIndex = Number(rawValue - 1n);
    const snapshot = snaps[snapshotIndex];

    if (!snapshot) {
      return false;
    }

    // pause processing new transactions...
    await this.transactions.pause();

    // then pause the miner, too.
    await this.#miner.pause();

    // wait for anything in the process of being saved to finish up
    await this.#blockBeingSavedPromise;

    // Pending transactions are always removed when you revert, even if they
    // were present before the snapshot was created. Ideally, we'd remove only
    // the new transactions.. but we'll leave that for another day.
    this.transactions.clear();

    const blocks = this.blocks;
    const currentHash = blocks.latest.hash().toBuffer();
    const snapshotBlock = snapshot.block;
    const snapshotHeader = snapshotBlock.header;
    const snapshotHash = snapshotBlock.hash().toBuffer();

    // remove this and all stored snapshots after this snapshot
    snaps.splice(snapshotIndex);

    // if there are no more listeners, stop listening to new blocks
    if (snaps.length === 0) {
      snapshots.unsubscribeFromBlocks();
    }

    // if the snapshot's hash is different than the latest block's hash we've
    // got new blocks to clean up.
    if (!currentHash.equals(snapshotHash)) {
      // if we've added blocks since we snapshotted we need to delete them and put
      // some things back the way they were.
      const blockPromises = [];
      let blockList = snapshots.blocks;
      while (blockList !== null) {
        if (blockList.current.equals(snapshotHash)) break;
        blockPromises.push(blocks.getByHash(blockList.current));
        blockList = blockList.next;
      }
      snapshots.blocks = blockList;

      await Promise.all(blockPromises).then(this.#deleteBlockData);

      setStateRootSync(
        this.vm.stateManager,
        snapshotHeader.stateRoot.toBuffer()
      );
      blocks.latest = snapshotBlock;
    }

    // put our time adjustment back
    this.#timeAdjustment = snapshot.timeAdjustment;

    // resume mining
    this.#miner.resume();

    // resume processing transactions
    this.transactions.resume();

    return true;
  }

  public async queueTransaction(transaction: Transaction, secretKey?: Data) {
    // NOTE: this.transactions.add *must* be awaited before returning the
    // `transaction.hash()`, as the transactionPool may change the transaction
    // (and thus its hash!)
    // It may also throw Errors that must be returned to the caller.
    const isExecutable =
      (await this.transactions.add(transaction, secretKey)) === true;
    if (isExecutable) {
      process.nextTick(this.emit.bind(this), "pendingTransaction", transaction);
    }

    const hash = Data.from(transaction.hash(), 32);
    if (this.#isPaused() || !this.#instamine) {
      return hash;
    } else {
      if (this.#instamine && this.#options.miner.legacyInstamine) {
        // in legacyInstamine mode we must wait for the transaction to be saved
        // before we can return the hash
        const { status, error } = await transaction.once("finalized");
        // in legacyInstamine mode we must throw on all rejected transaction
        // errors. We must also throw on `confirmed` tranactions when
        // vmErrorsOnRPCResponse is enabled.
        if (
          error &&
          (status === "rejected" || this.#options.chain.vmErrorsOnRPCResponse)
        )
          throw error;
      }
      return hash;
    }
  }

  public async simulateTransaction(
    transaction: SimulationTransaction,
    parentBlock: Block
  ) {
    let result: EVMResult;
    const options = this.#options;

    const data = transaction.data;
    let gasLeft = transaction.gas.toBigInt();
    // subtract out the transaction's base fee from the gas limit before
    // simulating the tx, because `runCall` doesn't account for raw gas costs.
    gasLeft -= Transaction.calculateIntrinsicGas(
      data ? data.toBuffer() : null,
      options.chain.hardfork
    );

    if (gasLeft >= 0) {
      const stateTrie = new SecureTrie(
        this.#database.trie,
        parentBlock.header.stateRoot.toBuffer()
      );
      const vm = this.createVmFromStateTrie(
        stateTrie,
        this.vm.allowUnlimitedContractSize
      );

      result = await vm.runCall({
        caller: transaction.from.toBuffer(),
        data: transaction.data && transaction.data.toBuffer(),
        gasPrice: transaction.gasPrice.toBuffer(),
        gasLimit: Quantity.from(gasLeft).toBuffer(),
        to: transaction.to && transaction.to.toBuffer(),
        value: transaction.value && transaction.value.toBuffer(),
        block: transaction.block
      });
    } else {
      result = {
        execResult: {
          runState: { programCounter: 0 },
          exceptionError: new VmError(ERROR.OUT_OF_GAS),
          returnValue: BUFFER_EMPTY
        }
      } as any;
    }
    if (result.execResult.exceptionError) {
      if (this.#options.chain.vmErrorsOnRPCResponse) {
        // eth_call transactions don't really have a transaction hash
        const hash = BUFFER_EMPTY;
        throw new RuntimeError(hash, result, RETURN_TYPES.RETURN_VALUE);
      } else {
        return Data.from(result.execResult.returnValue || "0x");
      }
    } else {
      return Data.from(result.execResult.returnValue || "0x");
    }
  }

  #traceTransaction = async (
    trie: SecureTrie,
    newBlock: RuntimeBlock,
    transaction: Transaction,
    options: TransactionTraceOptions,
    keys?: Buffer[],
    contractAddress?: Buffer
  ) => {
    let currentDepth = -1;
    const storageStack: TraceStorageMap[] = [];
    const storage: StorageRecords = {};

    // TODO: gas could go theoretically go over Number.MAX_SAFE_INTEGER.
    // (Ganache v2 didn't handle this possibility either, so it hasn't been
    // updated yet)
    let gas = 0;
    // TODO: returnValue isn't used... it wasn't used in v2 either. What's this
    // supposed to be?
    let returnValue = "";
    const structLogs: Array<StructLog> = [];
    const TraceData = TraceDataFactory();

    const stepListener = (
      event: StepEvent,
      next: (error?: any, cb?: any) => void
    ) => {
      // See these docs:
      // https://github.com/ethereum/go-ethereum/wiki/Management-APIs

      const gasLeft = event.gasLeft.toNumber();
      const totalGasUsedAfterThisStep =
        Quantity.from(transaction.gasLimit).toNumber() - gasLeft;
      const gasUsedPreviousStep = totalGasUsedAfterThisStep - gas;
      gas += gasUsedPreviousStep;

      const memory: ITraceData[] = [];
      if (options.disableMemory !== true) {
        // We get the memory as one large array.
        // Let's cut it up into 32 byte chunks as required by the spec.
        let index = 0;
        while (index < event.memory.length) {
          const slice = event.memory.slice(index, index + 32);
          memory.push(TraceData.from(Buffer.from(slice)));
          index += 32;
        }
      }

      const stack: ITraceData[] = [];
      if (options.disableStack !== true) {
        for (const stackItem of event.stack) {
          stack.push(TraceData.from(stackItem.toArrayLike(Buffer)));
        }
      }

      const structLog: StructLog = {
        depth: event.depth,
        error: "",
        gas: gasLeft,
        gasCost: 0,
        memory,
        op: event.opcode.name,
        pc: event.pc,
        stack,
        storage: null
      };

      // The gas difference calculated for each step is indicative of gas consumed in
      // the previous step. Gas consumption in the final step will always be zero.
      if (structLogs.length) {
        structLogs[structLogs.length - 1].gasCost = gasUsedPreviousStep;
      }

      if (options.disableStorage === true) {
        // Add the struct log as is - nothing more to do.
        structLogs.push(structLog);
        next();
      } else {
        const { depth: eventDepth } = event;
        if (currentDepth > eventDepth) {
          storageStack.pop();
        } else if (currentDepth < eventDepth) {
          storageStack.push(new TraceStorageMap());
        }

        currentDepth = eventDepth;

        switch (event.opcode.name) {
          case "SSTORE": {
            const key = stack[stack.length - 1];
            const value = stack[stack.length - 2];

            // new TraceStorageMap() here creates a shallow clone, to prevent other steps from overwriting
            structLog.storage = new TraceStorageMap(storageStack[eventDepth]);

            // Tell vm to move on to the next instruction. See below.
            structLogs.push(structLog);
            next();

            // assign after callback because this storage change actually takes
            // effect _after_ this opcode executes
            storageStack[eventDepth].set(key, value);
            break;
          }
          case "SLOAD": {
            const key = stack[stack.length - 1];
            vm.stateManager.getContractStorage(
              event.address,
              key.toBuffer(),
              (err: Error, result: Buffer) => {
                if (err) {
                  return next(err);
                }

                const value = TraceData.from(result);
                storageStack[eventDepth].set(key, value);

                // new TraceStorageMap() here creates a shallow clone, to prevent other steps from overwriting
                structLog.storage = new TraceStorageMap(
                  storageStack[eventDepth]
                );
                structLogs.push(structLog);
                next();
              }
            );
            break;
          }
          default:
            // new TraceStorageMap() here creates a shallow clone, to prevent other steps from overwriting
            structLog.storage = new TraceStorageMap(storageStack[eventDepth]);
            structLogs.push(structLog);
            next();
        }
      }
    };

    const transactionHash = transaction.hash();
    let txHashCurrentlyProcessing: Buffer = null;

    const beforeTxListener = (tx: Transaction) => {
      txHashCurrentlyProcessing = tx.hash();
      if (txHashCurrentlyProcessing.equals(transactionHash)) {
        if (keys && contractAddress) {
          const database = this.#database;
          return Promise.all(
            keys.map(async key => {
              // get the raw key using the hashed key
              const rawKey: Buffer = await database.storageKeys.get(key);

              vm.stateManager.getContractStorage(
                contractAddress,
                rawKey,
                (err: Error, result: Buffer) => {
                  if (err) {
                    throw err;
                  }

                  storage[Data.from(key, key.length).toString()] = {
                    key: Data.from(rawKey, rawKey.length),
                    value: Data.from(result, 32)
                  };
                }
              );
            })
          );
        }
        vm.on("step", stepListener);
      }
    };

    const afterTxListener = () => {
      if (txHashCurrentlyProcessing.equals(transactionHash)) {
        removeListeners();
      }
    };

    const removeListeners = () => {
      vm.removeListener("step", stepListener);
      vm.removeListener("beforeTx", beforeTxListener);
      vm.removeListener("afterTx", afterTxListener);
    };

    const blocks = this.blocks;

    // ethereumjs vm doesn't use the callback style anymore
    const getBlock = class T {
      static async [promisify.custom](number: BN) {
        const block = await blocks.get(number.toBuffer()).catch(_ => null);
        return block ? block.value : null;
      }
    };

    const vm = new VM({
      state: trie,
      activatePrecompiles: true,
      common: this.#common,
      allowUnlimitedContractSize: this.#options.chain
        .allowUnlimitedContractSize,
      blockchain: {
        getBlock
      } as any
    });

    // Listen to beforeTx and afterTx so we know when our target transaction
    // is processing. These events will add the event listener for getting the trace data.
    vm.on("beforeTx", beforeTxListener);
    vm.on("afterTx", afterTxListener);

    // Don't even let the vm try to flush the block's _cache to the stateTrie.
    // When forking some of the data that the traced function may request will
    // exist only on the main chain. Because we pretty much lie to the VM by
    // telling it we DO have data in our Trie, when we really don't, it gets
    // lost during the commit phase when it traverses the "borrowed" data's
    // trie (as it may not have a valid root). Because this is a trace, and we
    // don't need to commit the data, duck punching the `flush` method (the
    // simplest method I could find) is fine.
    // Remove this and you may see the infamous
    // `Uncaught TypeError: Cannot read property 'pop' of undefined` error!
    vm.stateManager._cache.flush = cb => cb();

    // Process the block without committing the data.
    // The vmerr key on the result appears to be removed.
    // The previous implementation had specific error handling.
    // It's possible we've removed handling specific cases in this implementation.
    // e.g., the previous incatation of RuntimeError
    await vm.runBlock({
      block: newBlock, // .value is the object the vm expects
      generate: true,
      skipBlockValidation: true
    });

    // Just to be safe
    removeListeners();

    // send state results back
    return {
      gas,
      structLogs,
      returnValue,
      storage
    };
  };

  #prepareNextBlock = (
    targetBlock: Block,
    parentBlock: Block,
    transactionHash: Buffer
  ): RuntimeBlock => {
    // Prepare the "next" block with necessary transactions
    const newBlock = new RuntimeBlock(
      Quantity.from((parentBlock.header.number.toBigInt() || 0n) + 1n),
      parentBlock.hash(),
      parentBlock.header.miner,
      parentBlock.header.gasLimit.toBuffer(),
      // make sure we use the same timestamp as the target block
      targetBlock.header.timestamp,
      this.#options.miner.difficulty,
      parentBlock.header.totalDifficulty
    ) as RuntimeBlock & { uncleHeaders: []; transactions: Transaction[] };
    newBlock.transactions = [];
    newBlock.uncleHeaders = [];

    const transactions = targetBlock.getTransactions();
    for (const tx of transactions) {
      newBlock.transactions.push(tx);

      // After including the target transaction, that's all we need to do.
      if (tx.hash().equals(transactionHash)) {
        break;
      }
    }

    return newBlock;
  };

  /**
   * traceTransaction
   *
   * Run a previously-run transaction in the same state in which it occurred at the time it was run.
   * This will return the vm-level trace output for debugging purposes.
   *
   * Strategy:
   *
   *  1. Find block where transaction occurred
   *  2. Set state root of that block
   *  3. Rerun every transaction in that block prior to and including the requested transaction
   *  4. Send trace results back.
   *
   * @param transactionHash
   * @param options
   */
  public async traceTransaction(
    transactionHash: string,
    options: TransactionTraceOptions
  ) {
    const transactionHashBuffer = Data.from(transactionHash).toBuffer();
    // #1 - get block via transaction object
    const transaction = await this.transactions.get(transactionHashBuffer);

    if (!transaction) {
      throw new Error("Unknown transaction " + transactionHash);
    }

    const targetBlock = await this.blocks.get(transaction._blockNum);
    const parentBlock = await this.blocks.getByHash(
      targetBlock.header.parentHash.toBuffer()
    );

    const newBlock = this.#prepareNextBlock(
      targetBlock,
      parentBlock,
      transactionHashBuffer
    );

    // #2 - Set state root of original block
    //
    // TODO: Forking needs the forked block number passed during this step:
    // https://github.com/trufflesuite/ganache-core/blob/develop/lib/blockchain_double.js#L917
    const trie = new SecureTrie(
      this.#database.trie,
      parentBlock.header.stateRoot.toBuffer()
    );

    // #3 - Rerun every transaction in block prior to and including the requested transaction
    const { gas, structLogs, returnValue } = await this.#traceTransaction(
      trie,
      newBlock,
      transaction,
      options
    );

    // #4 - Send results back
    return { gas, structLogs, returnValue };
  }

  /**
   * storageRangeAt
   *
   * Returns a contract's storage given a starting key and max number of
   * entries to return.
   *
   * Strategy:
   *
   *  1. Find block where transaction occurred
   *  2. Set state root of that block
   *  3. Use contract address storage trie to get the storage keys from the transaction
   *  4. Sort and filter storage keys using the startKey and maxResult
   *  5. Rerun every transaction in that block prior to and including the requested transaction
   *  6. Send storage results back
   *
   * @param blockHash
   * @param txIndex
   * @param contractAddress
   * @param startKey
   * @param maxResult
   */
  public async storageRangeAt(
    blockHash: string | Buffer,
    txIndex: number,
    contractAddress: string,
    startKey: string | Buffer,
    maxResult: number
  ): Promise<StorageRangeResult> {
    // #1 - get block information
    const targetBlock = await this.blocks.getByHash(blockHash);

    // get transaction using txIndex
    const transactions = targetBlock.getTransactions();
    const transaction = transactions[Quantity.from(txIndex).toNumber()];
    if (!transaction) {
      throw new Error(
        `transaction index ${txIndex} is out of range for block ${blockHash}`
      );
    }

    // #2 - set state root of block
    const parentBlock = await this.blocks.getByHash(
      targetBlock.header.parentHash.toBuffer()
    );
    const trie = new SecureTrie(
      this.#database.trie,
      parentBlock.header.stateRoot.toBuffer()
    );

    // get the contractAddress account storage trie
    const contractAddressBuffer = Address.from(contractAddress).toBuffer();
    const addressDataPromise = this.getFromTrie(trie, contractAddressBuffer);
    const addressData = await addressDataPromise;
    if (!addressData) {
      throw new Error(`account ${contractAddress} doesn't exist`);
    }

    // #3 - use the contractAddress storage trie to get relevant hashed keys
    const getStorageKeys = () => {
      const storageTrie = trie.copy();
      // An address's stateRoot is stored in the 3rd rlp entry
      storageTrie.root = ((rlpDecode(addressData) as any) as [
        Buffer /*nonce*/,
        Buffer /*amount*/,
        Buffer /*stateRoot*/,
        Buffer /*codeHash*/
      ])[2];

      return new Promise<RangedStorageKeys>((resolve, reject) => {
        const startKeyBuffer = Data.from(startKey).toBuffer();
        const compare = (a: Buffer, b: Buffer) => a.compare(b) < 0;

        const keys: Buffer[] = [];
        const handleData = ({ key }) => {
          // ignore anything that comes before our starting point
          if (startKeyBuffer.compare(key) > 0) return;

          // #4 - sort and filter keys
          // insert the key exactly where it needs to go in the array
          const position = findInsertPosition(keys, key, compare);
          // ignore if the value couldn't possibly be relevant
          if (position > maxResult) return;
          keys.splice(position, 0, key);
        };

        const handleEnd = () => {
          if (keys.length > maxResult) {
            // we collected too much data, so we've got to trim it a bit
            resolve({
              // only take the maximum number of entries requested
              keys: keys.slice(0, maxResult),
              // assign nextKey
              nextKey: Data.from(keys[maxResult])
            });
          } else {
            resolve({
              keys,
              nextKey: null
            });
          }
        };

        const rs = storageTrie.createReadStream();
        rs.on("data", handleData).on("error", reject).on("end", handleEnd);
      });
    };
    const { keys, nextKey } = await getStorageKeys();

    // #5 -  rerun every transaction in that block prior to and including the requested transaction
    // prepare block to be run in traceTransaction
    const transactionHashBuffer = transaction.hash();
    const newBlock = this.#prepareNextBlock(
      targetBlock,
      parentBlock,
      transactionHashBuffer
    );
    // get storage data given a set of keys
    const options = {
      disableMemory: true,
      disableStack: true,
      disableStorage: false
    };

    const { storage } = await this.#traceTransaction(
      trie,
      newBlock,
      transaction,
      options,
      keys,
      contractAddressBuffer
    );

    // #6 - send back results
    return {
      storage,
      nextKey
    };
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

    // pause processing new transactions...
    await this.transactions.pause();

    // then pause the miner, too.
    await this.#miner.pause();

    // wait for anything in the process of being saved to finish up
    await this.#blockBeingSavedPromise;

    await this.emit("stop");

    if (this.#state === Status.started) {
      this.#state = Status.stopping;
      await this.#database.close();
      this.#state = Status.stopped;
    }
  }
}
