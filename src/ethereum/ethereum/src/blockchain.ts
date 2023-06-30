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
  StructLog,
  TraceTransactionOptions,
  EthereumRawAccount,
  TraceTransactionResult
} from "@ganache/ethereum-utils";
import type { InterpreterStep, EVMResult } from "@ethereumjs/evm";
import { decode } from "@ganache/rlp";
import { KECCAK256_RLP } from "@ethereumjs/util";
import { Common } from "@ethereumjs/common";
import { EEI, VM } from "@ethereumjs/vm";
import {
  EvmError as VmError,
  EvmErrorMessage as ERROR,
  EVM
} from "@ethereumjs/evm";
import { EthereumInternalOptions, Hardfork } from "@ganache/ethereum-options";
import {
  Quantity,
  Data,
  BUFFER_EMPTY,
  BUFFER_32_ZERO,
  BUFFER_256_ZERO,
  KNOWN_CHAINIDS,
  keccak,
  Logger
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
  TypedTransaction,
  serializeForDb
} from "@ganache/ethereum-transaction";
import { Block, RuntimeBlock, Snapshots } from "@ganache/ethereum-block";
import {
  SimulationTransaction,
  applySimulationOverrides,
  CallOverrides
} from "./helpers/run-call";
import { ForkStateManager } from "./forking/state-manager";
import type { DefaultStateManager } from "@ethereumjs/statemanager";
import { GanacheTrie } from "./helpers/trie";
import { ForkTrie } from "./forking/trie";
import { activatePrecompiles, warmPrecompiles } from "./helpers/precompiles";
import TransactionReceiptManager from "./data-managers/transaction-receipt-manager";
import {
  makeStepEvent,
  VmAfterTransactionEvent,
  VmBeforeTransactionEvent,
  VmConsoleLogEvent,
  VmStepEvent
} from "./provider-events";

import mcl from "mcl-wasm";
import { maybeGetLogs } from "@ganache/console.log";
import { dumpTrieStorageDetails } from "./helpers/storage-range-at";
import { GanacheStateManager } from "./state-manager";
import { TrieDB } from "./trie-db";
import { Trie } from "@ethereumjs/trie";
import { removeEIP3860InitCodeSizeLimitCheck } from "./helpers/common-helpers";

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
  "ganache:vm:tx:console.log": VmConsoleLogEvent;
  ready: undefined;
  stop: undefined;
};

export type BlockchainOptions = {
  db?: string | object;
  db_path?: string;
  initialAccounts?: Account[];
  hardfork?: string;
  allowUnlimitedContractSize?: boolean;
  allowUnlimitedInitCodeSize?: boolean;
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
function setStateRootSync(
  stateManager: DefaultStateManager,
  stateRoot: Buffer
) {
  stateManager._trie.root(stateRoot);
  stateManager._cache.clear();
  stateManager._storageTries = {};
}

function makeTrie(blockchain: Blockchain, trieDB: TrieDB, root: Data) {
  if (blockchain.fallback) {
    return new ForkTrie(trieDB, root ? root.toBuffer() : null, blockchain);
  } else {
    return new GanacheTrie(trieDB, root ? root.toBuffer() : null, blockchain);
  }
}

function createCommon(chainId: number, networkId: number, hardfork: Hardfork) {
  const common = Common.custom(
    {
      name: "ganache",
      networkId: networkId,
      chainId: chainId,
      comment: "Local test network",
      defaultHardfork: hardfork
    },
    // if we were given a chain id that matches a real chain, use it
    // NOTE: I don't think Common serves a purpose other than instructing the
    // VM what hardfork is in use (and what EIPs are active). But just incase
    // things change in the future its configured "more correctly" here.
    { baseChain: KNOWN_CHAINIDS.has(chainId) ? chainId : 1 }
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
    this.#database = new Database(options, this);
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
        options.chain.networkId = Number(common.networkId());
        options.chain.chainId = Number(common.chainId());
      } else {
        await database.initialize();
        common = this.common = createCommon(
          options.chain.chainId,
          options.chain.networkId,
          options.chain.hardfork
        );

        if (options.chain.allowUnlimitedInitCodeSize) {
          removeEIP3860InitCodeSizeLimitCheck(common);
        }
      }

      this.isPostMerge = this.common.gteHardfork("merge");

      const blocks = (this.blocks = await BlockManager.initialize(
        this,
        common,
        database.blockIndexes,
        database.blocks
      ));

      this.blockLogs = new BlockLogManager(database.blockLogs, this);
      this.transactions = new TransactionManager(
        options,
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
        // Grab current time once to be used in all references to "now", to avoid
        // any discrepancies. See https://github.com/trufflesuite/ganache/issues/3271
        const startTime = new Date();

        // if we don't have a time from the user get one now
        if (options.chain.time == null) options.chain.time = startTime;

        // create first block
        const timestamp = options.chain.time.getTime();
        const firstBlockTime = Math.floor(timestamp / 1000);

        // if we are using clock time we need to record the time offset so
        // other blocks can have timestamps relative to our initial time.
        if (options.miner.timestampIncrement === "clock") {
          this.#timeAdjustment = timestamp - +startTime;
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
          blocks.latest = await this.#blockBeingSavedPromise.then(
            ({ block }) => block
          );
          // when we are forking, blocks.earliest is already set to what was
          // retrieved from the fork
          if (!blocks.earliest) {
            blocks.earliest = blocks.latest;
          }
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
        miner.on("ganache:vm:tx:console.log", event => {
          options.logging.logger.log(...event.logs);
          this.emit("ganache:vm:tx:console.log", event);
        });
        //#endregion

        //#region automatic mining
        const nullResolved = Promise.resolve(null);
        const mineAll = (maxTransactions: Capacity, onlyOneBlock?: boolean) =>
          this.#isPaused()
            ? nullResolved
            : this.mine(maxTransactions, onlyOneBlock);
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
        // TODO: the block has already done most of the work serializing the tx
        // we should reuse it, if possible
        // https://github.com/trufflesuite/ganache/issues/4341
        const serialized = serializeForDb(tx, blockHash, blockNumberQ, index);
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
      this.common,
      Quantity.from(previousNumber + 1n),
      previousBlock.hash(),
      this.coinbase,
      minerOptions.blockGasLimit,
      Quantity.Zero,
      Quantity.from(timestamp),
      this.isPostMerge ? Quantity.Zero : minerOptions.difficulty,
      previousHeader.totalDifficulty,
      this.getMixHash(previousBlock.hash().toBuffer()),
      Block.calcNextBaseFee(previousBlock),
      KECCAK256_RLP
    );
  };

  getMixHash(data: Buffer) {
    // mixHash is used as an RNG post merge hardfork
    return this.isPostMerge ? keccak(data) : BUFFER_32_ZERO;
  }

  isStarted = () => {
    return this.#state === Status.started;
  };

  mine = async (
    maxTransactions: number | Capacity,
    onlyOneBlock: boolean = false,
    timestamp?: number
  ) => {
    const nextBlock = this.#readyNextBlock(this.blocks.latest, timestamp);

    const transactions = await this.#miner.mine(
      nextBlock,
      maxTransactions,
      onlyOneBlock
    );
    await this.#blockBeingSavedPromise;

    if (this.#options.miner.timestampIncrement !== "clock") {
      // if block time is incremental, adjustments should only apply once,
      // otherwise they accumulate with each block.
      this.#timeAdjustment = 0;
    } else if (timestamp !== undefined) {
      // when miner.timestampIncrement is a number, the previous block timestamp
      // is used as a reference for the next block, so this call is not
      // required.
      this.setTimeDiff(timestamp * 1000);
    }

    return {
      transactions,
      blockNumber: nextBlock.header.number
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
      this.#options.logging.logger.log(
        "Warning: startMining called when miner was already started"
      );
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
      getBlock: async (number: bigint) => {
        const block = await blocks
          .get(Quantity.toBuffer(number))
          .catch(_ => null);
        return block ? { hash: () => block.hash().toBuffer() } : null;
      }
    } as any;
    // ethereumjs-vm wants to "copy" the blockchain when `vm.copy` is called.
    blockchain.copy = () => {
      return blockchain;
    };

    common = common || this.common;

    // TODO: prefixCodeHashes should eventually be conditional
    // https://github.com/trufflesuite/ganache/issues/3701
    const stateManager = this.fallback
      ? new ForkStateManager({
          trie: stateTrie as ForkTrie,
          prefixCodeHashes: false
        })
      : new GanacheStateManager({ trie: stateTrie, prefixCodeHashes: false });

    const eei = new EEI(stateManager, common, blockchain);
    const evm = new EVM({ common, allowUnlimitedContractSize, eei });
    const vm = await VM.create({
      activatePrecompiles: false,
      common,
      blockchain,
      stateManager,
      evm
    });

    if (activatePrecompile) {
      await activatePrecompiles(vm.eei);

      if (common.isActivatedEIP(2537)) {
        // BLS12-381 curve, not yet included in any supported hardforks
        // but probably will be in the Shanghai hardfork
        // TODO: remove above comment once Shanghai is supported!
        await mclInitPromise; // ensure that mcl is initialized!
      }
    }
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
      initialAccounts.forEach(account => {
        this.vm.eei.putAccount(account.address, account as any);
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
        this.common,
        Quantity.from(fallbackBlock.header.number.toBigInt() + 1n),
        fallbackBlock.hash(),
        this.coinbase,
        blockGasLimit,
        Quantity.Zero,
        Quantity.from(timestamp),
        this.isPostMerge ? Quantity.Zero : minerOptions.difficulty,
        fallbackBlock.header.totalDifficulty,
        this.getMixHash(fallbackBlock.hash().toBuffer()),
        baseFeePerGas,
        KECCAK256_RLP
      );

      // store the genesis block in the database
      const { block, serialized } = genesis.finalize(
        KECCAK256_RLP,
        KECCAK256_RLP,
        BUFFER_256_ZERO,
        this.trie.root(),
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
      this.common,
      rawBlockNumber,
      Data.from(BUFFER_32_ZERO),
      this.coinbase,
      blockGasLimit,
      Quantity.Zero,
      Quantity.from(timestamp),
      this.isPostMerge ? Quantity.Zero : this.#options.miner.difficulty,
      Quantity.Zero, // we start the totalDifficulty at 0
      // we use the initial trie root as the genesis block's mixHash as it
      // is deterministic based on initial wallet conditions
      this.isPostMerge ? keccak(this.trie.root()) : BUFFER_32_ZERO,
      baseFeePerGas,
      KECCAK256_RLP
    );

    // store the genesis block in the database
    const { block, serialized } = genesis.finalize(
      KECCAK256_RLP,
      KECCAK256_RLP,
      BUFFER_256_ZERO,
      this.trie.root(),
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
   * Adjusts the internal time adjustment such that the provided time is considered the "current" time.
   * @param newTime - the time (in milliseconds) that will be considered the "current" time
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
        this.vm.stateManager as DefaultStateManager,
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

    const { hash } = transaction;
    const instamine = this.#instamine;
    if (!instamine || this.#isPaused()) {
      return hash;
    } else {
      const options = this.#options;
      // if the transaction is not executable, we just have to return the hash
      if (instamine && options.miner.instamine === "eager") {
        if (!isExecutable) {
          // users have been confused about why ganache "hangs" when sending a
          // transaction with a "too-high" nonce. This message should help them
          // understand what's going on.
          options.logging.logger.log(
            `Transaction "${hash}" has a too-high nonce; this transaction has been added to the pool, and will be processed when its nonce is reached. See https://github.com/trufflesuite/ganache/issues/4165 for more information.`
          );
        }
        // in eager instamine mode we must wait for the transaction to be saved
        // before we can return the hash
        const { status, error } = await transaction.once("finalized");
        // in eager instamine mode we must throw on all rejected transaction
        // errors. We must also throw on `confirmed` transactions when
        // vmErrorsOnRPCResponse is enabled.
        if (
          error &&
          (status === "rejected" || options.chain.vmErrorsOnRPCResponse)
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
    const to = hasToAddress ? new Address(transaction.to.toBuffer()) : null;

    const common = this.fallback
      ? this.fallback.getCommonForBlock(this.common, transaction.block.header)
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
      const options = this.#options;

      const vm = await this.createVmFromStateTrie(
        stateTrie,
        options.chain.allowUnlimitedContractSize,
        false, // precompiles have already been initialized in the stateTrie
        common
      );

      // take a checkpoint so the `runCall` never writes to the trie. We don't
      // commit/revert later because this stateTrie is ephemeral anyway.
      await vm.eei.checkpoint();

      vm.evm.events.on("step", (event: InterpreterStep) => {
        const logs = maybeGetLogs(event);
        if (logs) {
          options.logging.logger.log(...logs);
          this.emit("ganache:vm:tx:console.log", {
            context: transactionContext,
            logs
          });
        }

        if (!this.#emitStepEvent) return;
        const ganacheStepEvent = makeStepEvent(transactionContext, event);
        this.emit("ganache:vm:tx:step", ganacheStepEvent);
      });

      const caller = transaction.from.toBuffer();
      const callerAddress = new Address(caller);

      if (common.isActivatedEIP(2929)) {
        const eei = vm.eei;
        // handle Berlin hardfork warm storage reads
        warmPrecompiles(eei);
        eei.addWarmedAddress(caller);
        if (to) eei.addWarmedAddress(to.buf);

        // shanghai hardfork requires that we warm the coinbase address
        if (common.isActivatedEIP(3651)) {
          eei.addWarmedAddress(transaction.block.header.coinbase.buf);
        }
      }

      // If there are any overrides requested for eth_call, apply
      // them now before running the simulation.
      await applySimulationOverrides(stateTrie, vm, overrides);

      // we need to update the balance and nonce of the sender _before_
      // we run this transaction so that things that rely on these values
      // are correct (like contract creation!).
      const fromAccount = await vm.eei.getAccount(callerAddress);
      fromAccount.nonce += 1n;
      const txCost = gasLimit * transaction.gasPrice.toBigInt();
      const startBalance = fromAccount.balance;
      // TODO: should we throw if insufficient funds?
      fromAccount.balance = txCost > startBalance ? 0n : startBalance - txCost;
      await vm.eei.putAccount(callerAddress, fromAccount);

      // finally, run the call
      result = await vm.evm.runCall({
        caller: callerAddress,
        data: transaction.data && transaction.data.toBuffer(),
        gasPrice: transaction.gasPrice.toBigInt(),
        gasLimit: gasLeft,
        to,
        value: transaction.value == null ? 0n : transaction.value.toBigInt(),
        block: transaction.block as any
      });
    } else {
      result = {
        execResult: {
          runState: { programCounter: 0 },
          exceptionError: new VmError(ERROR.OUT_OF_GAS),
          returnValue: BUFFER_EMPTY
        }
      } as EVMResult;
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

  /**
   * Creates a new VM with it's internal state set to that of the given `block`,
   * up to, but _not_ including, the transaction at the given
   * `transactionIndex`.
   *
   * Note: the VM is returned in a "checkpointed" state.
   *
   * @param transactionIndex
   * @param trie
   * @param block
   */
  #createFastForwardVm = async (
    transactionIndex: number,
    trie: GanacheTrie,
    block: RuntimeBlock & { transactions: VmTransaction[] }
  ): Promise<VM & { stateManager: GanacheStateManager }> => {
    const blocks = this.blocks;
    // ethereumjs vm doesn't use the callback style anymore
    const blockchain = {
      getBlock: async (number: bigint) => {
        const block = await blocks
          .get(Quantity.toBuffer(number))
          .catch(_ => null);
        return block ? { hash: () => block.hash().toBuffer() } : null;
      }
    } as any;

    const common = this.fallback
      ? this.fallback.getCommonForBlock(this.common, block.header)
      : this.common;

    // TODO: prefixCodeHashes should eventually be conditional
    // https://github.com/trufflesuite/ganache/issues/3701
    const stateManager = this.fallback
      ? new ForkStateManager({
          trie: trie as ForkTrie,
          prefixCodeHashes: false
        })
      : new GanacheStateManager({ trie, prefixCodeHashes: false });

    const eei = new EEI(stateManager, common, blockchain);
    const evm = new EVM({
      common,
      allowUnlimitedContractSize:
        this.#options.chain.allowUnlimitedContractSize,
      eei
    });
    const vm = await VM.create({
      activatePrecompiles: false,
      common,
      blockchain,
      stateManager,
      evm
    });

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
    (vm.stateManager as GanacheStateManager)._cache.flush = async () => {};

    // Process the block without committing the data.
    await vm.stateManager.checkpoint();

    for (let i = 0; i < transactionIndex; i++) {
      const tx = block.transactions[i] as any;
      const transactionEventContext = {};
      this.emit("ganache:vm:tx:before", {
        context: transactionEventContext
      });
      await vm.runTx({
        skipHardForkValidation: true,
        skipNonce: true,
        skipBalance: true,
        skipBlockGasLimitValidation: true,
        tx,
        block: block as any
      });
      this.emit("ganache:vm:tx:after", {
        context: transactionEventContext
      });
    }
    return vm as VM & { stateManager: GanacheStateManager };
  };

  #traceTransaction = async (
    transactionIndex: number,
    trie: GanacheTrie,
    newBlock: RuntimeBlock & { transactions: VmTransaction[] },
    options: TraceTransactionOptions
  ): Promise<TraceTransactionResult> => {
    const vm = await this.#createFastForwardVm(
      transactionIndex,
      trie,
      newBlock
    );

    let currentDepth = -1;
    const storageStack: TraceStorageMap[] = [];

    const storage: StorageRecords = {};

    let gas = 0n;
    const structLogs: Array<StructLog> = [];
    const TraceData = TraceDataFactory();

    const transaction = newBlock.transactions[transactionIndex];
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

      const gasLeft = event.gasLeft;
      const totalGasUsedAfterThisStep = transaction.gasLimit - gasLeft;
      const gasUsedPreviousStep = totalGasUsedAfterThisStep - gas;
      gas += gasUsedPreviousStep;

      let memory: ITraceData[];
      if (options.disableMemory === true) {
        memory = [];
      } else {
        // We get the memory as one large array.
        // Let's cut it up into 32 byte chunks as required by the spec.
        const limit = Number(event.memoryWordCount);
        memory = Array(limit);
        let index = 0;
        while (index < limit) {
          const offset = index * 32;
          const slice = event.memory.subarray(offset, offset + 32);
          memory[index++] = TraceData.from(slice);
        }
      }

      const stack: ITraceData[] = [];
      if (options.disableStack !== true) {
        for (const stackItem of event.stack) {
          stack.push(TraceData.from(Quantity.toBuffer(stackItem)));
        }
      }

      const structLog: StructLog = {
        depth: event.depth + 1,
        error: "",
        gas: Quantity.from(gasLeft),
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
        structLogs[structLogs.length - 1].gasCost = Number(gasUsedPreviousStep);
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
              event.address,
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

    vm.evm.events.on("step", stepListener);
    this.emit("ganache:vm:tx:before", {
      context: transactionEventContext
    });
    await vm.runTx({
      skipHardForkValidation: true,
      skipNonce: true,
      skipBalance: true,
      skipBlockGasLimitValidation: true,
      tx: transaction as any,
      block: newBlock as any
    });
    this.emit("ganache:vm:tx:after", {
      context: transactionEventContext
    });
    vm.evm.events.removeListener("step", stepListener);

    // send state results back
    return {
      gas: Quantity.from(gas),
      structLogs,
      returnValue: "",
      storage
    };
  };

  isPostMerge: boolean;

  /**
   * Creates a block based on the given `targetBlock` that contains only the
   * transactions from `targetBlock` up to and including the transaction at
   * `transactionIndex`.
   *
   * @param targetBlock
   * @param parentBlock
   * @param transactionIndex
   * @returns
   */
  #prepareNextBlock = (
    targetBlock: Block,
    parentBlock: Block,
    transactionIndex: number
  ): RuntimeBlock & {
    uncleHeaders: [];
    transactions: VmTransaction[];
  } => {
    targetBlock.header.parentHash;
    // Prepare the "next" block with necessary transactions
    const newBlock = new RuntimeBlock(
      this.common,
      Quantity.from((parentBlock.header.number.toBigInt() || 0n) + 1n),
      parentBlock.hash(),
      Address.from(parentBlock.header.miner.toString()),
      parentBlock.header.gasLimit,
      Quantity.Zero,
      // make sure we use the same timestamp as the target block
      targetBlock.header.timestamp,
      this.isPostMerge ? Quantity.Zero : this.#options.miner.difficulty,
      parentBlock.header.totalDifficulty,
      this.getMixHash(parentBlock.hash().toBuffer()),
      Block.calcNextBaseFee(parentBlock),
      KECCAK256_RLP
    ) as RuntimeBlock & {
      uncleHeaders: [];
      transactions: VmTransaction[];
    };
    newBlock.transactions = [];
    newBlock.uncleHeaders = [];

    const transactions = targetBlock.getTransactions();
    for (let i = 0; i <= transactionIndex; i++) {
      const tx = transactions[i];
      newBlock.transactions.push(tx.toVmTransaction());
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

    const txIndex = transaction.index.toNumber();
    const newBlock = this.#prepareNextBlock(targetBlock, parentBlock, txIndex);

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
      await this.#traceTransaction(txIndex, trie, newBlock, options);

    // #4 - Send results back
    return { gas, structLogs, returnValue, storage };
  }

  /**
   * storageRangeAt
   *
   * Returns a contract's storage given a starting key and max number of
   * entries to return.
   *
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
    // get block information
    const targetBlock = await this.blocks.getByHash(blockHash);

    // get transaction using txIndex
    const transactions = targetBlock.getTransactions();
    const transaction = transactions[txIndex];
    if (!transaction) {
      throw new Error(
        `transaction index ${txIndex} is out of range for block ${blockHash}`
      );
    }

    const parentBlock = await this.blocks.getByHash(
      targetBlock.header.parentHash.toBuffer()
    );
    const { trie: trieDb, storageKeys: storageKeysDb } = this.#database;
    const trie = makeTrie(this, trieDb, parentBlock.header.stateRoot);

    // get the contractAddress account storage trie
    const contractAddressBuffer = Address.toBuffer(contractAddress);
    const rawAccount = await trie.get(contractAddressBuffer);
    if (!rawAccount) {
      throw new Error(`account ${contractAddress} doesn't exist`);
    }
    let storageTrie: Trie;
    if (txIndex === 0) {
      // there are no transactions to run, so let's just grab what we need
      // from the last block's trie
      const [, , stateRoot] = decode<EthereumRawAccount>(rawAccount);
      trie.setContext(
        stateRoot,
        contractAddressBuffer,
        parentBlock.header.number
      );
      storageTrie = trie;
    } else {
      // prepare block to be run in traceTransaction
      const newBlock = this.#prepareNextBlock(
        targetBlock,
        parentBlock,
        txIndex
      );

      // run every transaction in that block prior to the requested transaction
      const vm = await this.#createFastForwardVm(txIndex, trie, newBlock);

      storageTrie = await vm.stateManager.getStorageTrie(contractAddressBuffer);
    }

    return await dumpTrieStorageDetails(
      Data.toBuffer(startKey),
      maxResult,
      storageTrie,
      storageKeysDb
    );
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
    if (this.vm) {
      this.vm.events.removeAllListeners();
      this.vm.evm && this.vm.evm.events.removeAllListeners();
    }

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
