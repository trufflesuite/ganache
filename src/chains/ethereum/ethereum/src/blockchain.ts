import { EOL } from "os";
import Miner, { Capacity } from "./miner/miner";
import Database from "./database";
import Emittery from "emittery";
import {
  BlockLogs,
  Account,
  ITraceData,
  TraceDataFactory,
  TraceStorageMap,
  RuntimeError,
  CallError,
  StorageKeys,
  StorageRangeAtResult,
  StorageRecords,
  RangedStorageKeys,
  StructLog,
  TraceTransactionOptions,
  EthereumRawAccount,
  TraceTransactionResult
} from "@ganache/ethereum-utils";
import type { Address as EthereumJsAddress } from "ethereumjs-util";
import type { InterpreterStep } from "@ethereumjs/vm/dist/evm/interpreter";
import { decode } from "@ganache/rlp";
import { BN, KECCAK256_RLP } from "ethereumjs-util";
import Common from "@ethereumjs/common";
import VM from "@ethereumjs/vm";
import { EVMResult } from "@ethereumjs/vm/dist/evm/evm";
import { VmError, ERROR } from "@ethereumjs/vm/dist/exceptions";
import { EthereumInternalOptions, Hardfork } from "@ganache/ethereum-options";
import {
  Quantity,
  Data,
  BUFFER_EMPTY,
  BUFFER_32_ZERO,
  BUFFER_256_ZERO,
  findInsertPosition,
  KNOWN_CHAINIDS
} from "@ganache/utils";
import AccountManager from "./data-managers/account-manager";
import BlockManager from "./data-managers/block-manager";
import BlockLogManager from "./data-managers/blocklog-manager";
import TransactionManager from "./data-managers/transaction-manager";
import { Fork } from "./forking/fork";
import { Address } from "@ganache/ethereum-address";
import {
  calculateIntrinsicGas,
  InternalTransactionReceipt,
  VmTransaction,
  TypedTransaction
} from "@ganache/ethereum-transaction";
import { Block, RuntimeBlock, Snapshots } from "@ganache/ethereum-block";
import {
  SimulationTransaction,
  applySimulationOverrides,
  CallOverrides
} from "./helpers/run-call";
import { ForkStateManager } from "./forking/state-manager";
import {
  DefaultStateManager,
  StateManager
} from "@ethereumjs/vm/dist/state/index";
import { GanacheTrie } from "./helpers/trie";
import { ForkTrie } from "./forking/trie";
import type { LevelUp } from "levelup";
import { activatePrecompiles, warmPrecompiles } from "./helpers/precompiles";
import TransactionReceiptManager from "./data-managers/transaction-receipt-manager";
import { BUFFER_ZERO } from "@ganache/utils";
import {
  makeStepEvent,
  VmAfterTransactionEvent,
  VmBeforeTransactionEvent,
  VmStepEvent
} from "./provider-events";

import mcl from "mcl-wasm";
import { ConsoleLogs } from "@truffle/console.log";

const mclInitPromise = mcl.init(mcl.BLS12_381).then(() => {
  mcl.setMapToMode(mcl.IRTF); // set the right map mode; otherwise mapToG2 will return wrong values.
  mcl.verifyOrderG1(true); // subgroup checks for G1
  mcl.verifyOrderG2(true); // subgroup checks for G2
});

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
  pendingTransaction: TypedTransaction;
  "ganache:vm:tx:step": VmStepEvent;
  "ganache:vm:tx:before": VmBeforeTransactionEvent;
  "ganache:vm:tx:after": VmAfterTransactionEvent;
  "ganache:vm:tx:console.log": ConsoleLogs;
  ready: undefined;
  stop: undefined;
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
  instamine: "eager" | "strict";
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
 * @param stateManager -
 * @param stateRoot -
 */
function setStateRootSync(stateManager: StateManager, stateRoot: Buffer) {
  (stateManager as any)._trie.root = stateRoot;
  (stateManager as any)._cache.clear();
  (stateManager as any)._storageTries = {};
}

function makeTrie(blockchain: Blockchain, db: LevelUp | null, root: Data) {
  if (blockchain.fallback) {
    return new ForkTrie(db, root ? root.toBuffer() : null, blockchain);
  } else {
    return new GanacheTrie(db, root ? root.toBuffer() : null, blockchain);
  }
}

function createCommon(chainId: number, networkId: number, hardfork: Hardfork) {
  const common = Common.forCustomChain(
    // if we were given a chain id that matches a real chain, use it
    // NOTE: I don't think Common serves a purpose other than instructing the
    // VM what hardfork is in use. But just incase things change in the future
    // its configured "more correctly" here.
    KNOWN_CHAINIDS.has(chainId) ? chainId : 1,
    {
      name: "ganache",
      networkId: networkId,
      chainId: chainId,
      comment: "Local test network"
    },
    hardfork
  );

  // the VM likes to listen to "hardforkChanged" events from common, but:
  //  a) we don't currently support changing hardforks
  //  b) it can cause `MaxListenersExceededWarning`.
  // Since we don't need it we overwrite .on to make it be quiet.
  (common as any).on = () => {};
  return common;
}

export default class Blockchain extends Emittery<BlockchainTypedEvents> {
  #state: Status = Status.starting;
  #miner: Miner;
  #blockBeingSavedPromise: Promise<{ block: Block; blockLogs: BlockLogs }>;
  /**
   * When not instamining (blockTime > 0) this value holds the timeout timer.
   */
  #timer: NodeJS.Timer | null = null;

  /**
   * Because step events are expensive to create and emit, CPU-wise, we do it
   * conditionally.
   */
  #emitStepEvent: boolean = false;
  public blocks: BlockManager;
  public blockLogs: BlockLogManager;
  public transactions: TransactionManager;
  public transactionReceipts: TransactionReceiptManager;
  public storageKeys: Database["storageKeys"];
  public accounts: AccountManager;
  public vm: VM;
  public trie: GanacheTrie;

  readonly #database: Database;
  readonly #options: EthereumInternalOptions;
  readonly #instamine: boolean;
  public common: Common;

  public fallback: Fork;

  /**
   * Initializes the underlying Database and handles synchronization between
   * the API and the database.
   *
   * Emits a `ready` event once the database and all dependencies are fully
   * initialized.
   * @param options -
   */
  constructor(
    options: EthereumInternalOptions,
    coinbase: Address,
    fallback?: Fork
  ) {
    super();

    this.#options = options;
    this.fallback = fallback;
    this.coinbase = coinbase;
    this.#instamine = !options.miner.blockTime || options.miner.blockTime <= 0;
    this.#database = new Database(options.database, this);
  }

  async initialize(initialAccounts: Account[]) {
    const database = this.#database;
    const options = this.#options;
    const instamine = this.#instamine;

    try {
      let common: Common;
      if (this.fallback) {
        await this.fallback.initialize();
        await database.initialize();

        common = this.common = this.fallback.common;
        options.fork.blockNumber = this.fallback.blockNumber.toNumber();
        options.chain.networkId = common.networkId();
        options.chain.chainId = common.chainId();
      } else {
        await database.initialize();
        common = this.common = createCommon(
          options.chain.chainId,
          options.chain.networkId,
          options.chain.hardfork
        );
      }

      const blocks = (this.blocks = await BlockManager.initialize(
        this,
        common,
        database.blockIndexes,
        database.blocks
      ));

      this.blockLogs = new BlockLogManager(database.blockLogs, this);
      this.transactions = new TransactionManager(
        options.miner,
        common,
        this,
        database.transactions
      );
      this.transactionReceipts = new TransactionReceiptManager(
        database.transactionReceipts,
        this
      );
      this.accounts = new AccountManager(this);
      this.storageKeys = database.storageKeys;

      // if we have a latest block, use it to set up the trie.
      const { latest } = blocks;
      {
        let stateRoot: Data | null;
        if (latest) {
          this.#blockBeingSavedPromise = Promise.resolve({
            block: latest,
            blockLogs: null
          });
          ({ stateRoot } = latest.header);
        } else {
          stateRoot = null;
        }
        this.trie = makeTrie(this, database.trie, stateRoot);
      }

      // create VM and listen to step events
      this.vm = await this.createVmFromStateTrie(
        this.trie,
        options.chain.allowUnlimitedContractSize,
        true
      );

      {
        // create first block

        // if we don't have a time from the user get one now
        if (options.chain.time == null) options.chain.time = new Date();

        const timestamp = options.chain.time.getTime();
        const firstBlockTime = Math.floor(timestamp / 1000);

        // if we are using clock time we need to record the time offset so
        // other blocks can have timestamps relative to our initial time.
        if (options.miner.timestampIncrement === "clock") {
          this.#timeAdjustment = timestamp - Date.now();
        }

        // if we don't already have a latest block, create a genesis block!
        if (!latest) {
          if (initialAccounts.length > 0) {
            await this.#commitAccounts(initialAccounts);
          }

          this.#blockBeingSavedPromise = this.#initializeGenesisBlock(
            firstBlockTime,
            options.miner.blockGasLimit,
            initialAccounts
          );
          blocks.earliest = blocks.latest =
            await this.#blockBeingSavedPromise.then(({ block }) => block);
        }
      }

      {
        // configure and start miner
        const txPool = this.transactions.transactionPool;
        const minerOpts = options.miner;
        const miner = (this.#miner = new Miner(
          minerOpts,
          txPool.executables,
          this.vm,
          this.#readyNextBlock
        ));

        //#region re-emit miner events:
        miner.on("ganache:vm:tx:before", event => {
          this.emit("ganache:vm:tx:before", event);
        });
        miner.on("ganache:vm:tx:step", event => {
          if (!this.#emitStepEvent) return;
          this.emit("ganache:vm:tx:step", event);
        });
        miner.on("ganache:vm:tx:after", event => {
          this.emit("ganache:vm:tx:after", event);
        });
        miner.on("ganache:vm:tx:console.log", logs => {
          this.emit("ganache:vm:tx:console.log", logs);
        });
        //#endregion

        //#region automatic mining
        const nullResolved = Promise.resolve(null);
        const mineAll = (maxTransactions: Capacity, onlyOneBlock = false) =>
          this.#isPaused()
            ? nullResolved
            : this.mine(maxTransactions, null, onlyOneBlock);
        if (instamine) {
          // insta mining
          // whenever the transaction pool is drained mine the txs into blocks
          // only one transaction should be added per block
          txPool.on("drain", mineAll.bind(null, Capacity.Single));
        } else {
          // interval mining
          const wait = () =>
            (this.#timer = setTimeout(next, minerOpts.blockTime * 1e3));
          // when interval mining, only one block should be mined. the block
          // can, however, be filled
          const next = () => {
            mineAll(Capacity.FillBlock, true).then(wait);
          };
          wait();
        }
        //#endregion

        miner.on("block", this.#handleNewBlockData);

        this.once("stop").then(() => miner.clearListeners());
      }
    } catch (e) {
      // we failed to start up :-( bail!
      this.#state = Status.stopping;
      // ignore errors while stopping here, since we are already in an
      // exceptional case
      await this.stop().catch(_ => {});

      throw e;
    }

    this.#state = Status.started;
    this.emit("ready");
  }

  #saveNewBlock = ({
    block,
    serialized,
    storageKeys,
    transactions
  }: {
    block: Block;
    serialized: Buffer;
    storageKeys: StorageKeys;
    transactions: TypedTransaction[];
  }) => {
    const { blocks } = this;
    blocks.latest = block;
    return this.#database.batch(() => {
      const blockHash = block.hash();
      const blockHeader = block.header;
      const blockNumberQ = blockHeader.number;
      const blockNumber = blockNumberQ.toBuffer();
      const blockLogs = BlockLogs.create(blockHash);
      const timestamp = blockHeader.timestamp;
      const timestampStr = new Date(timestamp.toNumber() * 1000).toString();
      const logOutput: string[] = [];
      transactions.forEach((tx: TypedTransaction, i: number) => {
        const hash = tx.hash.toBuffer();
        const index = Quantity.from(i);

        // save transaction to the database
        const serialized = tx.serializeForDb(blockHash, blockNumberQ, index);
        this.transactions.set(hash, serialized);

        // save receipt to the database
        const receipt = tx.getReceipt();
        const encodedReceipt = receipt.serialize(true);
        this.transactionReceipts.set(hash, encodedReceipt);

        // collect block logs
        tx.getLogs().forEach(blockLogs.append.bind(blockLogs, index, tx.hash));

        // prepare log output
        logOutput.push(
          this.#getTransactionLogOutput(
            hash,
            receipt,
            blockHeader.number,
            timestampStr,
            tx.execException
          )
        );
      });

      // save storage keys to the database
      storageKeys.forEach(value => {
        this.storageKeys.put(value.hashedKey, value.key);
      });

      blockLogs.blockNumber = blockHeader.number;

      // save block logs to the database
      this.blockLogs.set(blockNumber, blockLogs.serialize());

      // save block to the database
      blocks.putBlock(blockNumber, blockHash, serialized);

      // update the "latest" index
      blocks.updateLatestIndex(blockNumber);

      // output to the log, if we have data to output
      if (logOutput.length > 0)
        this.#options.logging.logger.log(logOutput.join(EOL));

      return { block, blockLogs, transactions };
    });
  };

  /**
   * Emit the block now that everything has been fully saved to the database
   */
  #emitNewBlock = async (blockInfo: {
    block: Block;
    blockLogs: BlockLogs;
    transactions: TypedTransaction[];
  }) => {
    const options = this.#options;
    const { block, blockLogs, transactions } = blockInfo;

    transactions.forEach(transaction => {
      transaction.finalize("confirmed", transaction.execException);
    });

    if (options.miner.instamine === "eager") {
      // in eager instamine mode we must delay the broadcast of new blocks
      await new Promise(resolve => {
        // we delay emitting blocks and blockLogs because we need to allow for:
        // ```
        //  await provider.request({"method": "eth_sendTransaction"...)
        //  await provider.once("message") // <- should work
        // ```
        // If we don't have this delay here the messages will be sent before
        // the call has a chance to listen to the event.
        setImmediate(async () => {
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
    receipt: InternalTransactionReceipt,
    blockNumber: Quantity,
    timestamp: string,
    error: RuntimeError | undefined
  ) => {
    let str = `${EOL}  Transaction: ${Data.from(hash)}${EOL}`;

    const contractAddress = receipt.contractAddress;
    if (contractAddress != null) {
      str += `  Contract created: ${Address.from(contractAddress)}${EOL}`;
    }

    str += `  Gas usage: ${Quantity.toNumber(receipt.raw[1])}
  Block number: ${blockNumber.toNumber()}
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
    transactions: TypedTransaction[];
  }) => {
    this.#blockBeingSavedPromise = this.#blockBeingSavedPromise.then(() => {
      const saveBlockProm = this.#saveNewBlock(blockData);
      saveBlockProm.then(this.#emitNewBlock);
      // blockBeingSavedPromise should await the block being _saved_, but doesn't
      // need to await the block being emitted.
      return saveBlockProm;
    });

    await this.#blockBeingSavedPromise;
  };

  coinbase: Address;

  #readyNextBlock = (previousBlock: Block, timestamp?: number) => {
    const previousHeader = previousBlock.header;
    const previousNumber = previousHeader.number.toBigInt() || 0n;
    const minerOptions = this.#options.miner;
    if (timestamp == null) {
      timestamp = this.#adjustedTime(previousHeader.timestamp);
    }

    return new RuntimeBlock(
      Quantity.from(previousNumber + 1n),
      previousBlock.hash(),
      this.coinbase,
      minerOptions.blockGasLimit.toBuffer(),
      BUFFER_ZERO,
      Quantity.from(timestamp),
      minerOptions.difficulty,
      previousHeader.totalDifficulty,
      Block.calcNextBaseFee(previousBlock)
    );
  };

  isStarted = () => {
    return this.#state === Status.started;
  };

  mine = async (
    maxTransactions: number | Capacity,
    timestamp?: number,
    onlyOneBlock: boolean = false
  ) => {
    const nextBlock = this.#readyNextBlock(this.blocks.latest, timestamp);
    const transactions = await this.#miner.mine(
      nextBlock,
      maxTransactions,
      onlyOneBlock
    );
    await this.#blockBeingSavedPromise;
    return {
      transactions,
      blockNumber: nextBlock.header.number.toArrayLike(Buffer)
    };
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
      return this.mine(Capacity.FillBlock);
    }
  }

  createVmFromStateTrie = async (
    stateTrie: GanacheTrie | ForkTrie,
    allowUnlimitedContractSize: boolean,
    activatePrecompile: boolean,
    common?: Common
  ) => {
    const blocks = this.blocks;
    // ethereumjs vm doesn't use the callback style anymore
    const blockchain = {
      getBlock: async (number: BN) => {
        const block = await blocks.get(number.toBuffer()).catch(_ => null);
        return block ? { hash: () => block.hash().toBuffer() } : null;
      }
    } as any;
    // ethereumjs-vm wants to "copy" the blockchain when `vm.copy` is called.
    blockchain.copy = () => {
      return blockchain;
    };

    common = common || this.common;

    const vm = new VM({
      state: stateTrie,
      activatePrecompiles: false,
      common,
      allowUnlimitedContractSize,
      blockchain,
      stateManager: this.fallback
        ? new ForkStateManager({ common, trie: stateTrie as ForkTrie })
        : new DefaultStateManager({ common, trie: stateTrie })
    });
    if (activatePrecompile) {
      await activatePrecompiles(vm.stateManager);

      if (common.isActivatedEIP(2537)) {
        // BLS12-381 curve, not yet included in any supported hardforks
        // but probably will be in the Shanghai hardfork
        // TODO: remove above comment once Shanghai is supported!
        await mclInitPromise; // ensure that mcl is initialized!
      }
    }
    // skip `vm.init`, since we don't use any of it
    (vm as any)._isInitialized = true;
    return vm;
  };

  #commitAccounts = (accounts: Account[]) => {
    return Promise.all<void>(
      accounts.map(account =>
        this.trie.put(account.address.toBuffer(), account.serialize())
      )
    );
  };

  #initializeGenesisBlock = async (
    timestamp: number,
    blockGasLimit: Quantity,
    initialAccounts: Account[]
  ) => {
    if (this.fallback != null) {
      const { block: fallbackBlock } = this.fallback;
      const { miner: minerOptions } = this.#options;

      // commit accounts, but for forking.
      const stateManager = <DefaultStateManager>this.vm.stateManager;
      await stateManager.checkpoint();
      initialAccounts.forEach(acc => {
        const a = { buf: acc.address.toBuffer() } as any;
        (stateManager as any)._cache.put(a, acc);
        stateManager.touchAccount(a);
      });
      await stateManager.commit();

      // create the genesis block
      let baseFeePerGas: bigint;
      if (this.common.isActivatedEIP(1559)) {
        if (fallbackBlock.header.baseFeePerGas === undefined) {
          baseFeePerGas = Block.INITIAL_BASE_FEE_PER_GAS;
        } else {
          baseFeePerGas = fallbackBlock.header.baseFeePerGas.toBigInt();
        }
      }
      const genesis = new RuntimeBlock(
        Quantity.from(fallbackBlock.header.number.toBigInt() + 1n),
        fallbackBlock.hash(),
        this.coinbase,
        blockGasLimit.toBuffer(),
        BUFFER_ZERO,
        Quantity.from(timestamp),
        minerOptions.difficulty,
        fallbackBlock.header.totalDifficulty,
        baseFeePerGas
      );

      // store the genesis block in the database
      const { block, serialized } = genesis.finalize(
        KECCAK256_RLP,
        KECCAK256_RLP,
        BUFFER_256_ZERO,
        this.trie.root,
        0n,
        minerOptions.extraData,
        [],
        new Map()
      );
      const hash = block.hash();
      return this.blocks
        .putBlock(block.header.number.toBuffer(), hash, serialized)
        .then(_ => ({
          block,
          blockLogs: BlockLogs.create(hash)
        }));
    }

    await this.#commitAccounts(initialAccounts);

    // README: block `0` is weird in that a `0` _should_ be hashed as `[]`,
    // instead of `[0]`, so we set it to `Quantity.Empty` instead of
    // `Quantity.Zero` here. A few lines down in this function we swap
    // this `Quantity.Empty` for `Quantity.Zero`. This is all so we don't
    // have to have a "treat empty as 0` check in every function that uses the
    // "latest" block (which this genesis block will be for brief moment).
    const rawBlockNumber = Quantity.Empty;

    // create the genesis block
    const baseFeePerGas = this.common.isActivatedEIP(1559)
      ? Block.INITIAL_BASE_FEE_PER_GAS
      : undefined;
    const genesis = new RuntimeBlock(
      rawBlockNumber,
      Data.from(BUFFER_32_ZERO),
      this.coinbase,
      blockGasLimit.toBuffer(),
      BUFFER_ZERO,
      Quantity.from(timestamp),
      this.#options.miner.difficulty,
      Quantity.Zero, // we start the totalDifficulty at 0
      baseFeePerGas
    );

    // store the genesis block in the database
    const { block, serialized } = genesis.finalize(
      KECCAK256_RLP,
      KECCAK256_RLP,
      BUFFER_256_ZERO,
      this.trie.root,
      0n,
      this.#options.miner.extraData,
      [],
      new Map()
    );
    // README: set the block number to an actual 0 now.
    block.header.number = Quantity.Zero;
    const hash = block.hash();
    return this.blocks
      .putBlock(block.header.number.toBuffer(), hash, serialized)
      .then(_ => ({
        block,
        blockLogs: BlockLogs.create(hash)
      }));
  };

  /**
   * The number of milliseconds time should be adjusted by when computing the
   * "time" for a block.
   */
  #timeAdjustment: number = 0;

  /**
   * Returns the timestamp, adjusted by the timeAdjustment offset, in seconds.
   * @param precedingTimestamp - the timestamp of the block to be used as the
   * time source if `timestampIncrement` is not "clock".
   */
  #adjustedTime = (precedingTimestamp: Quantity) => {
    const timeAdjustment = this.#timeAdjustment;
    const timestampIncrement = this.#options.miner.timestampIncrement;
    if (timestampIncrement === "clock") {
      return Math.floor((Date.now() + timeAdjustment) / 1000);
    } else {
      return (
        precedingTimestamp.toNumber() +
        Math.floor(timeAdjustment / 1000) +
        timestampIncrement.toNumber()
      );
    }
  };

  /**
   * @param milliseconds - the number of milliseconds to adjust the time by.
   * Negative numbers are treated as 0.
   * @returns the total time offset *in milliseconds*
   */
  public increaseTime(milliseconds: number) {
    if (milliseconds < 0) {
      milliseconds = 0;
    }
    return (this.#timeAdjustment += milliseconds);
  }

  /**
   * @param newTime - the number of milliseconds to adjust the time by. Can be negative.
   * @returns the total time offset *in milliseconds*
   */
  public setTimeDiff(newTime: number) {
    // when using clock time use Date.now(), otherwise use the timestamp of the
    // current latest block
    const currentTime =
      this.#options.miner.timestampIncrement === "clock"
        ? Date.now()
        : this.blocks.latest.header.timestamp.toNumber() * 1000;
    return (this.#timeAdjustment = newTime - currentTime);
  }

  #deleteBlockData = async (
    blocksToDelete: Block[],
    newLatestBlockNumber: Buffer
  ) => {
    // if we are forking we need to make sure we clean up the forking related
    // metadata that isn't stored in the trie
    if ("revertMetaData" in this.trie) {
      await (this.trie as ForkTrie).revertMetaData(
        blocksToDelete[blocksToDelete.length - 1].header.number,
        blocksToDelete[0].header.number
      );
    }
    await this.#database.batch(() => {
      const { blocks, transactions, transactionReceipts, blockLogs } = this;
      // point to the new "latest" again
      blocks.updateLatestIndex(newLatestBlockNumber);
      // clean up old blocks
      blocksToDelete.forEach(block => {
        block.getTransactions().forEach(tx => {
          const txHash = tx.hash.toBuffer();
          transactions.del(txHash);
          transactionReceipts.del(txHash);
        });
        const blockNum = block.header.number.toBuffer();
        blocks.del(blockNum);
        blocks.del(block.hash().toBuffer());
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
    if (snapshotId.isNull()) {
      throw new Error("invalid snapshotId");
    }

    const rawValue = snapshotId.toBigInt();
    this.#options.logging.logger.log("Reverting to snapshot #" + snapshotId);

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
      const blockPromises: Promise<Block>[] = [];
      let blockList = snapshots.blocks;
      while (blockList !== null) {
        if (blockList.current.equals(snapshotHash)) break;
        blockPromises.push(blocks.getByHash(blockList.current));
        blockList = blockList.next;
      }
      snapshots.blocks = blockList;

      const blockData = await Promise.all(blockPromises);
      await this.#deleteBlockData(blockData, snapshotHeader.number.toBuffer());

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

  public async queueTransaction(
    transaction: TypedTransaction,
    secretKey?: Data
  ) {
    // NOTE: this.transactions.add *must* be awaited before returning the
    // `transaction.hash()`, as the transactionPool may change the transaction
    // (and thus its hash!)
    // It may also throw Errors that must be returned to the caller.
    const isExecutable =
      (await this.transactions.add(transaction, secretKey)) === true;
    if (isExecutable) {
      process.nextTick(this.emit.bind(this), "pendingTransaction", transaction);
    }

    const hash = transaction.hash;
    if (this.#isPaused() || !this.#instamine) {
      return hash;
    } else {
      if (this.#instamine && this.#options.miner.instamine === "eager") {
        // in eager instamine mode we must wait for the transaction to be saved
        // before we can return the hash
        const { status, error } = await transaction.once("finalized");
        // in eager instamine mode we must throw on all rejected transaction
        // errors. We must also throw on `confirmed` transactions when
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
    parentBlock: Block,
    overrides: CallOverrides
  ) {
    let result: EVMResult;

    const data = transaction.data;
    let gasLimit = transaction.gas.toBigInt();
    // subtract out the transaction's base fee from the gas limit before
    // simulating the tx, because `runCall` doesn't account for raw gas costs.
    const hasToAddress = transaction.to != null;
    let to: EthereumJsAddress = null;
    if (hasToAddress) {
      const toBuf = transaction.to.toBuffer();
      to = {
        equals: (a: { buf: Buffer }) => toBuf.equals(a.buf),
        buf: toBuf
      } as any;
    } else {
      to = null;
    }

    const common = this.fallback
      ? this.fallback.getCommonForBlockNumber(
          this.common,
          BigInt(transaction.block.header.number.toString())
        )
      : this.common;

    const gasLeft =
      gasLimit - calculateIntrinsicGas(data, hasToAddress, common);

    const transactionContext = {};
    this.emit("ganache:vm:tx:before", {
      context: transactionContext
    });

    if (gasLeft >= 0n) {
      const stateTrie = this.trie.copy(false);
      stateTrie.setContext(
        parentBlock.header.stateRoot.toBuffer(),
        null,
        parentBlock.header.number
      );

      const vm = await this.createVmFromStateTrie(
        stateTrie,
        this.#options.chain.allowUnlimitedContractSize,
        false, // precompiles have already been initialized in the stateTrie
        common
      );

      // take a checkpoint so the `runCall` never writes to the trie. We don't
      // commit/revert later because this stateTrie is ephemeral anyway.
      vm.stateManager.checkpoint();

      vm.on("step", (event: InterpreterStep) => {
        if (!this.#emitStepEvent) return;
        const ganacheStepEvent = makeStepEvent(transactionContext, event);
        this.emit("ganache:vm:tx:step", ganacheStepEvent);
      });

      const caller = transaction.from.toBuffer();

      if (common.isActivatedEIP(2929)) {
        const stateManager = vm.stateManager as DefaultStateManager;
        // handle Berlin hardfork warm storage reads
        warmPrecompiles(stateManager);
        stateManager.addWarmedAddress(caller);
        if (to) stateManager.addWarmedAddress(to.buf);
      }

      // If there are any overrides requested for eth_call, apply
      // them now before running the simulation.
      await applySimulationOverrides(stateTrie, vm, overrides);

      // we need to update the balance and nonce of the sender _before_
      // we run this transaction so that things that rely on these values
      // are correct (like contract creation!).
      const fromAccount = await vm.stateManager.getAccount({
        buf: caller
      } as any);
      fromAccount.nonce.iaddn(1);
      const txCost = new BN(
        (gasLimit * transaction.gasPrice.toBigInt()).toString()
      );
      fromAccount.balance.isub(txCost);
      await vm.stateManager.putAccount({ buf: caller } as any, fromAccount);

      // finally, run the call
      result = await vm.runCall({
        caller: {
          buf: caller,
          equals: (a: { buf: Buffer }) => caller.equals(a.buf)
        } as any,
        data: transaction.data && transaction.data.toBuffer(),
        gasPrice: new BN(transaction.gasPrice.toBuffer()),
        gasLimit: new BN(Quantity.toBuffer(gasLeft)),
        to,
        value:
          transaction.value == null
            ? new BN(0)
            : new BN(transaction.value.toBuffer()),
        block: transaction.block as any
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
    this.emit("ganache:vm:tx:after", {
      context: transactionContext
    });
    if (result.execResult.exceptionError) {
      throw new CallError(result);
    } else {
      return Data.from(result.execResult.returnValue || "0x");
    }
  }

  #traceTransaction = async (
    transaction: VmTransaction,
    trie: GanacheTrie,
    newBlock: RuntimeBlock & { transactions: VmTransaction[] },
    options: TraceTransactionOptions,
    keys?: Buffer[],
    contractAddress?: Buffer
  ): Promise<TraceTransactionResult> => {
    let currentDepth = -1;
    const storageStack: TraceStorageMap[] = [];

    const blocks = this.blocks;
    // ethereumjs vm doesn't use the callback style anymore
    const blockchain = {
      getBlock: async (number: BN) => {
        const block = await blocks.get(number.toBuffer()).catch(_ => null);
        return block ? { hash: () => block.hash().toBuffer() } : null;
      }
    } as any;

    const common = this.fallback
      ? this.fallback.getCommonForBlockNumber(
          this.common,
          BigInt(newBlock.header.number.toString())
        )
      : this.common;

    const vm = await VM.create({
      state: trie,
      activatePrecompiles: false,
      common,
      allowUnlimitedContractSize: this.vm.allowUnlimitedContractSize,
      blockchain,
      stateManager: this.fallback
        ? new ForkStateManager({ common, trie: trie as ForkTrie })
        : new DefaultStateManager({ common, trie: trie })
    });

    const storage: StorageRecords = {};

    // TODO: gas could go theoretically go over Number.MAX_SAFE_INTEGER.
    // (Ganache v2 didn't handle this possibility either, so it hasn't been
    // updated yet)
    let gas = 0;
    const structLogs: Array<StructLog> = [];
    const TraceData = TraceDataFactory();

    const transactionEventContext = {};

    const stepListener = async (
      event: InterpreterStep,
      next: (error?: any, cb?: any) => void
    ) => {
      // See these docs:
      // https://github.com/ethereum/go-ethereum/wiki/Management-APIs
      if (this.#emitStepEvent) {
        this.emit(
          "ganache:vm:tx:step",
          makeStepEvent(transactionEventContext, event)
        );
      }

      const gasLeft = event.gasLeft.toNumber();
      const totalGasUsedAfterThisStep =
        transaction.gasLimit.toNumber() - gasLeft;
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
        depth: event.depth + 1,
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
            const result = await vm.stateManager.getContractStorage(
              event.address as any,
              key.toBuffer()
            );
            const value = TraceData.from(result);
            storageStack[eventDepth].set(key, value);

            // new TraceStorageMap() here creates a shallow clone, to prevent other steps from overwriting
            structLog.storage = new TraceStorageMap(storageStack[eventDepth]);
            structLogs.push(structLog);
            next();
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

    // Don't even let the vm try to flush the block's _cache to the stateTrie.
    // When forking some of the data that the traced function may request will
    // exist only on the main chain. Because we pretty much lie to the VM by
    // telling it we DO have data in our Trie, when we really don't, it gets
    // lost during the commit phase when it traverses the "borrowed" datum's
    // trie (as it may not have a valid root). Because this is a trace, and we
    // don't need to commit the data, duck punching the `flush` method (the
    // simplest method I could find) is fine.
    // Remove this and you may see the infamous
    // `Uncaught TypeError: Cannot read property 'pop' of undefined` error!
    (vm.stateManager as any)._cache.flush = () => {};

    // Process the block without committing the data.
    // The vmerr key on the result appears to be removed.
    // The previous implementation had specific error handling.
    // It's possible we've removed handling specific cases in this implementation.
    // e.g., the previous incantation of RuntimeError
    await vm.stateManager.checkpoint();
    try {
      for (let i = 0, l = newBlock.transactions.length; i < l; i++) {
        const tx = newBlock.transactions[i] as any;
        if (tx === transaction) {
          if (keys && contractAddress) {
            const database = this.#database;
            const ejsContractAddress = { buf: contractAddress } as any;
            await Promise.all(
              keys.map(async key => {
                // get the raw key using the hashed key
                const rawKey = await database.storageKeys.get(key);

                const result = await vm.stateManager.getContractStorage(
                  ejsContractAddress,
                  rawKey
                );

                storage[Data.toString(key, key.length)] = {
                  key: Data.from(rawKey, rawKey.length),
                  value: Data.from(result, 32)
                };
              })
            );
            break;
          } else {
            vm.on("step", stepListener);
            // force the loop to break after running this transaction by setting
            // the current iteration past the end
            i = l;
          }
        }
        this.emit("ganache:vm:tx:before", {
          context: transactionEventContext
        });
        await vm.runTx({ tx, block: newBlock as any });
        this.emit("ganache:vm:tx:after", {
          context: transactionEventContext
        });
      }
      vm.removeListener("step", stepListener);
    } finally {
      await vm.stateManager.revert();
    }

    // send state results back
    return {
      gas,
      structLogs,
      returnValue: "",
      storage
    };
  };

  #prepareNextBlock = (
    targetBlock: Block,
    parentBlock: Block,
    transactionHash: Buffer
  ): RuntimeBlock & {
    uncleHeaders: [];
    transactions: VmTransaction[];
  } => {
    // Prepare the "next" block with necessary transactions
    const newBlock = new RuntimeBlock(
      Quantity.from((parentBlock.header.number.toBigInt() || 0n) + 1n),
      parentBlock.hash(),
      parentBlock.header.miner,
      parentBlock.header.gasLimit.toBuffer(),
      BUFFER_ZERO,
      // make sure we use the same timestamp as the target block
      targetBlock.header.timestamp,
      this.#options.miner.difficulty,
      parentBlock.header.totalDifficulty,
      Block.calcNextBaseFee(parentBlock)
    ) as RuntimeBlock & {
      uncleHeaders: [];
      transactions: VmTransaction[];
    };
    newBlock.transactions = [];
    newBlock.uncleHeaders = [];

    const transactions = targetBlock.getTransactions();
    for (const tx of transactions) {
      newBlock.transactions.push(tx.toVmTransaction());

      // After including the target transaction, that's all we need to do.
      if (tx.hash.toBuffer().equals(transactionHash)) {
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
   * @param transactionHash -
   * @param options -
   */
  public async traceTransaction(
    transactionHash: string,
    options: TraceTransactionOptions
  ) {
    const transactionHashBuffer = Data.toBuffer(transactionHash);
    // #1 - get block via transaction object
    const transaction = await this.transactions.get(transactionHashBuffer);

    if (!transaction) {
      throw new Error("Unknown transaction " + transactionHash);
    }

    const targetBlock = await this.blocks.getByHash(
      transaction.blockHash.toBuffer()
    );
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
    // https://github.com/trufflesuite/ganache/blob/develop/lib/blockchain_double.js#L917
    const trie = this.trie.copy();
    trie.setContext(
      parentBlock.header.stateRoot.toBuffer(),
      null,
      parentBlock.header.number
    );

    // #3 - Rerun every transaction in block prior to and including the requested transaction
    const { gas, structLogs, returnValue, storage } =
      await this.#traceTransaction(
        newBlock.transactions[transaction.index.toNumber()],
        trie,
        newBlock,
        options
      );

    // #4 - Send results back
    return { gas, structLogs, returnValue, storage };
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
   * @param blockHash -
   * @param txIndex -
   * @param contractAddress -
   * @param startKey -
   * @param maxResult -
   */
  public async storageRangeAt(
    blockHash: string,
    txIndex: number,
    contractAddress: string,
    startKey: string,
    maxResult: number
  ): Promise<StorageRangeAtResult> {
    // #1 - get block information
    const targetBlock = await this.blocks.getByHash(blockHash);

    // get transaction using txIndex
    const transactions = targetBlock.getTransactions();
    const transaction = transactions[txIndex];
    if (!transaction) {
      throw new Error(
        `transaction index ${txIndex} is out of range for block ${blockHash}`
      );
    }

    // #2 - set state root of block
    const parentBlock = await this.blocks.getByHash(
      targetBlock.header.parentHash.toBuffer()
    );
    const trie = makeTrie(
      this,
      this.#database.trie,
      parentBlock.header.stateRoot
    );

    // get the contractAddress account storage trie
    const contractAddressBuffer = Address.from(contractAddress).toBuffer();
    const addressData = await trie.get(contractAddressBuffer);
    if (!addressData) {
      throw new Error(`account ${contractAddress} doesn't exist`);
    }

    // #3 - use the contractAddress storage trie to get relevant hashed keys
    const getStorageKeys = () => {
      const storageTrie = trie.copy(false);
      // An address's stateRoot is stored in the 3rd rlp entry
      storageTrie.setContext(
        decode<EthereumRawAccount>(addressData)[2],
        contractAddressBuffer,
        parentBlock.header.number
      );

      return new Promise<RangedStorageKeys>((resolve, reject) => {
        const startKeyBuffer = Data.toBuffer(startKey);
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
    const transactionHashBuffer = transaction.hash.toBuffer();
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
      newBlock.transactions[transaction.index.toNumber()],
      trie,
      newBlock,
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

  public toggleStepEvent(enable: boolean) {
    this.#emitStepEvent = enable;
    this.#miner.toggleStepEvent(enable);
  }

  /**
   * Gracefully shuts down the blockchain service and all of its dependencies.
   */
  public async stop() {
    // If the blockchain is still initializing we don't want to shut down
    // yet because there may still be database calls in flight. Leveldb may
    // cause a segfault due to a race condition between a db write and the close
    // call.
    if (this.#state === Status.starting) {
      await this.once("ready");
    }

    this.#state = Status.stopping;

    // stop the polling miner, if necessary
    clearTimeout(this.#timer);

    // clean up listeners
    this.vm && this.vm.removeAllListeners();

    // pause processing new transactions...
    this.transactions && (await this.transactions.pause());

    // then pause the miner, too.
    this.#miner && (await this.#miner.pause());

    // wait for anything in the process of being saved to finish up
    await this.#blockBeingSavedPromise;

    this.fallback && (await this.fallback.close());

    await this.emit("stop");

    this.#database && (await this.#database.close());
    this.#state = Status.stopped;
  }
}
