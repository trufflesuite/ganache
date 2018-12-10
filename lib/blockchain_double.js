var to = require("./utils/to.js");
var Account = require("ethereumjs-account");
var Block = require("ethereumjs-block");
var Log = require("./utils/log");
var Receipt = require("./utils/receipt");
var Database = require("./database");
var Trie = require("merkle-patricia-tree");
var VM = require("ethereumjs-vm");
var RuntimeError = require("./utils/runtimeerror");
var utils = require("ethereumjs-util");
var async = require("async");
var Heap = require("heap");
var EventEmitter = require("events");
var _ = require("lodash");

function BlockchainDouble(options) {
  var self = this;
  EventEmitter.apply(self);

  this.database = new Database(options);

  this.options = options = this._applyDefaultOptions(options || {});

  this.logger = options.logger || console;

  this.pending_transactions = [];

  // tracks latest state root as latest block changes
  this._latestStateRoot = undefined;

  // updated periodically to keep up with the times
  this.blockGasLimit = options.gasLimit;
  this.defaultTransactionGasLimit = options.defaultTransactionGasLimit;
  this.timeAdjustment = 0;
}

const defaultOptions = {
  gasLimit: "0x6691b7",
  defaultTransactionGasLimit: "0x15f90",
  time: null,
  debug: false,
  allowUnlimitedContractSize: false
};

// inheritence w/ prototype chaining
BlockchainDouble.prototype = Object.create(EventEmitter.prototype);
BlockchainDouble.prototype.constructor = BlockchainDouble;

BlockchainDouble.prototype._applyDefaultOptions = function(options) {
  // We want this function to mutate the options object so that we can report
  // our settings back to our consumer application (e.g., ganache)
  return _.merge(options, defaultOptions, Object.assign({}, options));
};

BlockchainDouble.prototype.getVM = function getVM(root) {
  const self = this;

  let vm = new VM({
    state: this.getStateTrie(root),
    blockchain: {
      // EthereumJS VM needs a blockchain object in order to get block information.
      // When calling getBlock() it will pass a number that's of a Buffer type.
      // Unfortunately, it uses a 64-character buffer (when converted to hex) to
      // represent block numbers as well as block hashes. Since it's very unlikely
      // any block number will get higher than the maximum safe Javascript integer,
      // we can convert this buffer to a number ahead of time before calling our
      // own getBlock(). If the conversion succeeds, we have a block number.
      // If it doesn't, we have a block hash. (Note: Our implementation accepts both.)
      getBlock: function(number, done) {
        try {
          number = to.number(number);
        } catch (e) {
          // Do nothing; must be a block hash.
        }

        self.getBlock(number, done);
      }
    },
    enableHomestead: true,
    activatePrecompiles: true,
    allowUnlimitedContractSize: this.options.allowUnlimitedContractSize
  });

  if (this.options.debug === true) {
    // log executed opcodes, including args as hex
    vm.on("step", function(info) {
      var name = info.opcode.name;
      var argsNum = info.opcode.in;
      if (argsNum) {
        var args = info.stack
          .slice(-argsNum)
          .map((arg) => to.hex(arg))
          .join(" ");

        self.logger.log(`${name} ${args}`);
      } else {
        self.logger.log(name);
      }
    });
  }

  return vm;
};

BlockchainDouble.prototype.getLatestStateRoot = function getLatestStateRoot(callback) {
  return this._latestStateRoot;
};

BlockchainDouble.prototype.getStateTrie = function getStateTrie(root) {
  return new Trie(this.database.trie_db, root);
};

BlockchainDouble.prototype.initialize = function(accounts, callback) {
  var self = this;

  self.database.initialize(function(err) {
    if (err) {
      return callback(err);
    }

    self.latestBlock(function(err, block) {
      if (err) {
        return callback(err);
      }

      var options = self.options;

      if (options.time) {
        self.setTime(options.time);
      }

      // If we already have a block, then that means there's an existing chain.
      // Don't create a genesis block.
      if (block) {
        self.emit("block", block);
        return callback();
      }

      const vm = self.getVM();

      self.createGenesisBlock(function(err, block) {
        if (err) {
          return callback(err);
        }

        accounts = accounts || [];

        async.eachSeries(
          accounts,
          function(accountData, finished) {
            self.putAccount(accountData.account, accountData.address, vm, finished);
          },
          function(err) {
            if (err) {
              return callback(err);
            }

            block.header.stateRoot = vm.stateManager.trie.root;

            // Create first block
            self.putBlock(block, [], [], callback);
          }
        );
      });
    });
  });
};

// Overrideable so other implementations (forking) can edit it.
BlockchainDouble.prototype.createGenesisBlock = function(callback) {
  this.createBlock(callback);
};

BlockchainDouble.prototype.latestBlock = function(callback) {
  this.database.blocks.last(function(err, last) {
    if (err) {
      return callback(err);
    }
    callback(null, last);
  });
};

// number accepts number (integer, hex) or tag (e.g., "latest")
BlockchainDouble.prototype.getEffectiveBlockNumber = function(number, callback) {
  if (typeof number !== "string") {
    number = to.hex(number);
  }

  // If we have a hex number
  if (number.indexOf("0x") >= 0) {
    return callback(null, to.number(number));
  } else {
    if (number === "latest" || number === "pending") {
      return this.getHeight(callback);
    } else if (number === "earliest") {
      return callback(null, 0);
    }
  }
};

// number accepts number (integer, hex), tag (e.g., "latest") or block hash
// This function is used by ethereumjs-vm
BlockchainDouble.prototype.getBlock = function(number, callback) {
  var self = this;

  if (typeof number !== "string") {
    number = to.hex(number);
  }

  // If we have a hex number or a block hash
  if (number.indexOf("0x") >= 0) {
    var hash = number;

    // block hash
    if (hash.length > 40) {
      this.database.blockHashes.get(to.hex(hash), function(err, blockIndex) {
        if (err) {
          return callback(err);
        }
        return self.database.blocks.get(blockIndex, callback);
      });
    } else {
      // Block number
      return this.database.blocks.get(to.number(hash), callback);
    }
  } else {
    if (number === "latest" || number === "pending") {
      return this.latestBlock(callback);
    } else if (number === "earliest") {
      return this.database.blocks.first(callback);
    }
  }
};

BlockchainDouble.prototype.putBlock = function(block, logs, receipts, callback) {
  var self = this;

  this.database.blocks.length(function(err, length) {
    if (err) {
      return callback(err);
    }

    var requests = [
      self.database.blocks.push.bind(self.database.blocks, block),
      self.database.blockLogs.push.bind(self.database.blockLogs, logs),
      self.database.blockHashes.set.bind(
        self.database.blockHashes,
        to.hex(block.hash()),
        length
      )
    ];

    block.transactions.forEach(function(tx, index) {
      var txHash = to.txHash(tx);
      requests.push(
        self.database.transactions.set.bind(
          self.database.transactions,
          txHash,
          tx
        ),
        self.database.transactionReceipts.set.bind(
          self.database.transactionReceipts,
          txHash,
          receipts[index]
        )
      );
    });

    async.parallel(requests, (err, result) => {
      if (!err) {
        self.emit("block", block);
        self._latestStateRoot = block.header.stateRoot;
      }
      callback(err, result);
    });
  });
};

BlockchainDouble.prototype.popBlock = function(callback) {
  var self = this;

  this.database.blocks.last(function(err, block) {
    if (err) {
      return callback(err);
    }

    if (block == null) {
      return callback(null, null);
    }

    // update latest stateRoot before actually deleting to avoid race conditions
    self.getBlock(block.header.parentHash, function(err, parent) {
      if (err) {
        return callback(err);
      }

      if (parent == null) {
        return callback(new Error("Tried to pop genesis block, not allowed."));
      }

      var requests = [];
      var blockHash = to.hex(block.hash());

      block.transactions.forEach(function(tx) {
        var txHash = to.txHash(tx);

        requests.push(
          self.database.transactions.del.bind(
            self.database.transactions,
            txHash
          ),
          self.database.transactionReceipts.del.bind(
            self.database.transactionReceipts,
            txHash
          )
        );
      });

      requests.push(
        self.database.blockLogs.pop.bind(
          self.database.blockLogs
        ),
        self.database.blockHashes.del.bind(
          self.database.blockHashes,
          blockHash
        ),
        self.database.blocks.pop.bind(
          self.database.blocks
        ) // Do this one last in case anything relies on it.
      );

      async.series(requests, function(err) {
        if (err) {
          return callback(err);
        }

        callback(null, block);
      });
    });
  });
};

BlockchainDouble.prototype.clearPendingTransactions = function() {
  this.pending_transactions = [];
};

BlockchainDouble.prototype.putAccount = function(account, address, vm, callback) {
  var self = this;

  address = utils.toBuffer(address);
  if (typeof vm === "function") {
    callback = vm;
    vm = null;
  }

  function _putAccount(vm) {
    vm.stateManager.putAccount(address, account, function(err) {
      if (err) {
        return callback(err);
      }

      vm.stateManager.cache.flush(callback);
    });
  }

  if (vm) {
    _putAccount(vm);
  } else {
    let stateRoot = this.getLatestStateRoot();
    vm = self.getVM(stateRoot);
    _putAccount(vm);
  }
};

/**
 * createBlock
 *
 * Create a new block, where the parent's block is either the latest block
 * on the chain or the parent block passed in.
 *
 * @param  {Block}   parent   The block meant to be the parent block (optional)
 * @param  {Function} callback Callback function called after block is created
 * @return Block              The block created.
 */
BlockchainDouble.prototype.createBlock = function(parent, callback) {
  var self = this;

  if (typeof parent === "function") {
    callback = parent;
    parent = null;
  }

  var block = new Block();

  function getParent(callback) {
    if (parent) {
      return callback(null, parent);
    } else {
      self.latestBlock(callback);
    }
  }

  getParent(function(err, parent) {
    if (err) {
      return callback(err);
    }

    var parentNumber = parent != null ? to.number(parent.header.number) : -1;

    block.header.gasLimit = self.blockGasLimit;

    // Ensure we have the right block number for the VM.
    block.header.number = to.hex(parentNumber + 1);

    // Set the timestamp before processing txs
    block.header.timestamp = to.hex(self.currentTime());

    if (parent != null) {
      block.header.parentHash = to.hex(parent.hash());
    }

    // temporarily set the new block's state root to the parent's
    // will be updated by processBlock
    if (self._latestStateRoot) {
      block.header.stateRoot = self._latestStateRoot;
    }

    callback(null, block);
  });
};

BlockchainDouble.prototype.getQueuedNonce = function(address, callback) {
  const self = this;
  var nonce = null;

  this.pending_transactions.forEach(function(tx) {
    // tx.from and address are buffers, so cannot simply do
    // tx.from==address
    if (to.hex(tx.from) !== to.hex(address)) {
      return;
    }

    var pendingNonce = to.number(tx.nonce) || 0;
    // If this is the first queued nonce for this address we found,
    // or it's higher than the previous highest, note it.
    if (nonce === null || pendingNonce > nonce) {
      nonce = pendingNonce;
    }
  });

  // If we found a queued transaction nonce, return one higher
  // than the highest we found
  if (nonce != null) {
    return callback(null, Buffer.from([nonce + 1]));
  }

  let stateRoot = this.getLatestStateRoot();
  const stateTrie = self.getStateTrie(stateRoot);
  stateTrie.get(address, function(err, val) {
    if (err) {
      return callback(err);
    }

    var account = new Account(val);
    callback(null, account.nonce);
  });
};

BlockchainDouble.prototype.queueTransaction = function(tx) {
  this.pending_transactions.push(tx);
};

BlockchainDouble.prototype.sortByPriceAndNonce = function() {
  // Sorts transactions like I believe geth does.
  // See the description of 'SortByPriceAndNonce' at
  // https://github.com/ethereum/go-ethereum/blob/290e851f57f5d27a1d5f0f7ad784c836e017c337/core/types/transaction.go
  var self = this;
  var sortedByNonce = {};

  self.pending_transactions.forEach((tx) => {
    const from = to.hex(tx.from);
    if (sortedByNonce[from]) {
      sortedByNonce[from].push(tx);
    } else {
      sortedByNonce[from] = [tx];
    }
  });

  var priceSort = function(a, b) {
    return parseInt(to.hex(b.gasPrice), 16) - parseInt(to.hex(a.gasPrice), 16);
  };
  var nonceSort = function(a, b) {
    return parseInt(to.hex(a.nonce), 16) - parseInt(to.hex(b.nonce), 16);
  };

  // Now sort each address by nonce
  Object.keys(sortedByNonce).forEach((address) => {
    sortedByNonce[address].sort(nonceSort);
  });

  // Initialise a heap, sorted by price, for the head transaction from each account.
  var heap = new Heap(priceSort);
  Object.keys(sortedByNonce).forEach((address) => {
    heap.push(sortedByNonce[address].shift());
  });

  // Now reorder our transactions. Compare the next transactions from each account, and choose
  // the one with the highest gas price.
  const sortedTransactions = [];
  while (heap.size() > 0) {
    const best = heap.pop();
    let address = to.hex(best.from);
    if (sortedByNonce[address].length > 0) {
      // Push on the next transaction from this account
      heap.push(sortedByNonce[address].shift());
    }
    sortedTransactions.push(best);
  }
  self.pending_transactions = sortedTransactions;
};

BlockchainDouble.prototype.processCall = function(tx, blockNumber, callback) {
  var self = this;
  let vm;

  var cleanUpAndReturn = function(err, result) {
    vm.stateManager.revert(function(revertErr) {
      if (err) {
        return callback(err);
      }
      if (revertErr) {
        return callback(revertErr);
      }
      callback(null, result);
    });
  };

  var runCall = function(tx, err, block) {
    if (err) {
      return callback(err);
    }

    vm = self.getVM(block.header.stateRoot);

    // create a fake block with this fake transaction
    self.createBlock(block, function(err, block) {
      if (err) {
        return callback(err);
      }
      block.transactions.push(tx);

      // We checkpoint here for speed. We want all state trie reads/writes to happen in memory,
      // and the final output be flushed to the database at the end of transaction processing.
      vm.stateManager.checkpoint();

      var runArgs = {
        tx: tx,
        block: block,
        skipBalance: true,
        skipNonce: true
      };

      vm.runTx(runArgs, function(vmerr, result) {
        // This is a check that has been in there for awhile. I'm unsure if it's required, but it can't hurt.
        if (vmerr && vmerr instanceof Error === false) {
          vmerr = new Error("VM error: " + vmerr);
        }

        // If we're given an error back directly, it's worse than a runtime error. Expose it and get out.
        if (vmerr) {
          return cleanUpAndReturn(vmerr);
        }

        // If no error, check for a runtime error. This can return null if no runtime error.
        vmerr = RuntimeError.fromResults([tx], { results: [result] });

        cleanUpAndReturn(vmerr, result);
      });
    });
  };

  // Delegate block selection
  blockNumber === "latest"
    ? self.latestBlock(runCall.bind(null, tx))
    : self.getBlock(blockNumber, runCall.bind(null, tx));
};

/**
 * processBlock
 *
 * Process the passed in block and included transactions
 *
 * @param  {Block} block       block to process
 * @param  {Boolean} commit    Whether or not changes should be committed to the state
 * trie and the block appended to the end of the chain.
 * @param  {VM} vm Optional VM instance to use to process the block. If null, processBlock
 * gets its own VM instance from the stateManager.
 * @param  {Function} callback Callback function when transaction processing is completed.
 * @return [type]              [description]
 */
BlockchainDouble.prototype.processBlock = function(block, commit, vm, callback) {
  var self = this;

  vm = vm || self.getVM(block.header.stateRoot);

  // We checkpoint here for speed. We want all state trie reads/writes to happen in memory,
  // and the final output be flushed to the database at the end of transaction processing.
  vm.stateManager.checkpoint();

  var cleanup = function(err) {
    vm.stateManager.revert(function(e) {
      callback(err || e);
    });
  };

  vm.runBlock(
    {
      block: block,
      generate: true
    },
    function(vmerr, results) {
      // This is a check that has been in there for awhile. I'm unsure if it's required, but it can't hurt.
      if (vmerr && vmerr instanceof Error === false) {
        vmerr = new Error("VM error: " + vmerr);
      }

      // If we're given an error back directly, it's worse than a runtime error. Expose it and get out.
      if (vmerr) {
        return cleanup(vmerr);
      }

      // If no error, check for a runtime error. This can return null if no runtime error.
      vmerr = RuntimeError.fromResults(block.transactions, results);

      // Note, even if we have an error, some transactions may still have succeeded.
      // Process their logs if so, returning the error at the end.

      var logs = [];
      var receipts = [];

      var totalBlockGasUsage = 0;

      results.results.forEach(function(result) {
        totalBlockGasUsage += to.number(result.gasUsed);
      });

      block.header.gasUsed = utils.toBuffer(to.hex(totalBlockGasUsage));

      for (var v = 0; v < results.receipts.length; v++) {
        var result = results.results[v];
        var receipt = results.receipts[v];
        var tx = block.transactions[v];
        var txHash = to.txHash(tx, true);
        var txLogs = [];

        // Only process the transaction's logs if it didn't error.
        if (result.vm.exception === 1) {
          for (var i = 0; i < receipt.logs.length; i++) {
            var receiptLog = receipt.logs[i];
            var address = to.hex(receiptLog[0]);
            var topics = [];

            for (var j = 0; j < receiptLog[1].length; j++) {
              topics.push(to.hex(receiptLog[1][j]));
            }

            var data = to.hex(receiptLog[2]);

            var log = new Log({
              logIndex: to.hex(i),
              transactionIndex: to.hex(v),
              transactionHash: txHash,
              block: block,
              address: address,
              data: data,
              topics: topics,
              type: "mined"
            });

            logs.push(log);
            txLogs.push(log);
          }
        }

        let rcpt = new Receipt(
          tx,
          block,
          txLogs,
          result.gasUsed.toArrayLike(Buffer),
          receipt.gasUsed,
          result.createdAddress,
          receipt.status,
          to.hex(result.bloom.bitvector)
        );
        receipts.push(rcpt);
      }

      function commmitIfNeeded(cb) {
        if (commit === true) {
          vm.stateManager.commit(function(e) {
            if (e) {
              return cleanup(e);
            }

            block.header.stateRoot = vm.stateManager.trie.root;

            // Put that block on the end the chain
            self.putBlock(block, logs, receipts, cb);
          });
        } else {
          vm.stateManager.revert(cb);
        }
      }

      commmitIfNeeded(function(e) {
        if (e) {
          return callback(e);
        }
        // Note we return the vm err here too, if it exists.
        callback(vmerr, block.transactions, results);
      });
    }
  );
};

/**
 * processNextBlock
 *
 * Process the next block like a normal blockchain, pulling from the list of
 * pending transactions.
 *
 * @param  {number} timestamp at which the block is mined
 * @param  {Function} callback Callback when transaction processing is finished.
 * @return [type]              [description]
 */
BlockchainDouble.prototype.processNextBlock = function(timestamp, callback) {
  var self = this;

  if (typeof timestamp === "function") {
    callback = timestamp;
    timestamp = undefined;
  }

  self.sortByPriceAndNonce();

  // Grab only the transactions that can fit within the block
  var currentTransactions = [];
  var totalGasLimit = 0;
  var maxGasLimit = to.number(self.blockGasLimit);

  while (self.pending_transactions.length > 0) {
    var tx = self.pending_transactions[0];
    var gasLimit = to.number(tx.gasLimit);

    if (totalGasLimit + gasLimit <= maxGasLimit) {
      totalGasLimit += gasLimit;
      self.pending_transactions.shift();
      currentTransactions.push(tx);
    } else {
      // Next one won't fit. Break.
      break;
    }
  }

  // Remember, we ensured transactions had a valid gas limit when they were queued (in the state manager).
  // If we run into a case where we can't process any because one is higher than the gas limit,
  // then it's a serious issue. This should never happen, but let's check anyway.
  if (currentTransactions.length === 0 && self.pending_transactions.length > 0) {
    // Error like geth.
    var error = "Unexpected error condition: next transaction exceeds block gas limit";
    return callback(error);
  }

  // Create a new block meant to be the end of the chain
  this.createBlock(function(err, block) {
    if (err) {
      return callback(err);
    }

    // Overwrite block timestamp
    if (timestamp) {
      self.database.blocks.last(function(err, last) {
        if (err) {
          return callback(err);
        }
        if (last && to.number(last.header.timestamp) > timestamp) {
          self.logger.log(
            "Waring: Setting the block timestamp (" + timestamp + ") that is earlier than the parent block one."
          );
        }
      });
      block.header.timestamp = to.hex(timestamp);
      self.setTime(new Date(timestamp * 1000));
    }
    // Add transactions to the block.
    Array.prototype.push.apply(block.transactions, currentTransactions);

    // Process the block, committing the block to the chain
    self.processBlock(block, true, null, callback);
  });
};

/**
 * processTransactionTrace
 *
 * Run a previously-run transaction in the same state in which it occurred at the time it was run.
 * This will return the vm-level trace output for debugging purposes.
 *
 * Strategy:
 *
 *  1. Find block where transaction occurred
 *  2. Rerun every transaction in that block prior to and including the requested transaction
 *  3. Send trace results back.
 *
 * @param  {[type]}   tx       [description]
 * @param  {Function} callback [description]
 * @return [type]              [description]
 */
BlockchainDouble.prototype.processTransactionTrace = function(hash, params, callback) {
  var self = this;
  var targetHash = to.hex(hash);
  var txHashCurrentlyProcessing = "";
  var txCurrentlyProcessing = null;
  var vm;

  var storageStack = {
    currentDepth: -1,
    stack: []
  };

  var returnVal = {
    gas: 0,
    returnValue: "",
    structLogs: []
  };

  function stepListener(event, next) {
    // See these docs:
    // https://github.com/ethereum/go-ethereum/wiki/Management-APIs

    var gasLeft = to.number(event.gasLeft);
    var totalGasUsedAfterThisStep = to.number(txCurrentlyProcessing.gasLimit) - gasLeft;
    var gasUsedThisStep = totalGasUsedAfterThisStep - returnVal.gas;
    returnVal.gas += gasUsedThisStep;

    var isMemoryEnabled = !params.disableMemory;
    var memory = null;
    if (isMemoryEnabled) {
      // Get memory and break it up into 32-byte words.
      // Note we may possibly have to pad the final word.
      memory = Buffer.from(event.memory).toString("hex");
      memory = memory.match(/.{1,64}/g) || [];

      if (memory.length > 0) {
        var lastItem = memory[memory.length - 1];
        if (lastItem.length < 64) {
          memory[memory.length - 1] = lastItem + new Array(64 - lastItem.length + 1).join("0");
        }
      }
    }

    var stack;
    if (params.disableStack) {
      stack = null;
    } else {
      stack = event.stack.map((item) => {
        return to.rpcDataHexString(item, 64).replace("0x", ""); // non-0x prefixed.
      });
    }

    var structLog = {
      depth: event.depth,
      error: "",
      gas: gasLeft,
      gasCost: gasUsedThisStep,
      memory,
      op: event.opcode.name,
      pc: event.pc,
      stack,
      storage: null
    };

    if (params.disableStorage) {
      returnVal.structLogs.push(structLog);
      next();
    } else {
      structLog = self.processStorageTrace(structLog, storageStack, event, vm, function(err, structLog) {
        if (err) {
          return next(err);
        }
        returnVal.structLogs.push(structLog);
        next();
      });
    }
  }

  function beforeTxListener(tx) {
    txCurrentlyProcessing = tx;
    txHashCurrentlyProcessing = to.txHash(tx);
    if (txHashCurrentlyProcessing === targetHash) {
      vm.on("step", stepListener);
    }
  }

  // afterTxListener cleans up everything.
  function afterTxListener() {
    if (txHashCurrentlyProcessing === targetHash) {
      vm.removeListener("step", stepListener);
      vm.removeListener("beforeTx", beforeTxListener);
      vm.removeListener("afterTx", afterTxListener);
    }
  }

  // #1 - get block via transaction receipt
  this.getTransactionReceipt(targetHash, function(err, receipt) {
    if (err) {
      return callback(err);
    }

    if (!receipt) {
      return callback(new Error("Unknown transaction " + targetHash));
    }

    var targetBlock = receipt.block;

    // Get the parent of the target block
    self.getBlock(to.rpcDataHexString(targetBlock.header.parentHash), function(err, parent) {
      if (err) {
        return callback(err);
      }

      // #2 - get VM at original block's stateRoot
      vm = self.getVM(parent.header.stateRoot);
      // Listen to beforeTx and afterTx so we know when our target transaction
      // is processing. These events will add the vent listener for getting the trace data.
      vm.on("beforeTx", beforeTxListener);
      vm.on("afterTx", afterTxListener);

      // Prepare the "next" block with necessary transactions
      self.createBlock(parent, function(err, block) {
        if (err) {
          return callback(err);
        }

        for (var i = 0; i < targetBlock.transactions.length; i++) {
          var tx = targetBlock.transactions[i];
          block.transactions.push(tx);

          // After including the target transaction, that's all we need to do.
          if (to.txHash(tx) === targetHash) {
            break;
          }
        }

        // #3 - Process the block without committing the data.
        self.processBlock(block, false, vm, function(err) {
          // Ignore runtime errors, or else erroneous transactions can't be traced.
          if (err && err.message.indexOf("VM Exception") === 0) {
            err = null;
          }

          // Just to be safe
          vm.removeListener("beforeTx", beforeTxListener);
          vm.removeListener("afterTx", afterTxListener);
          vm.removeListener("step", stepListener);

          // #5 - send state results back
          callback(err, returnVal);
        });
      });
    });
  });
};

BlockchainDouble.prototype.processStorageTrace = function(structLog, storageStack, event, vm, callback) {
  var name = event.opcode.name;

  var argsNum = event.opcode.in;
  var args = event.stack.slice(-argsNum).map((arg) => to.hex(arg));

  if (storageStack.currentDepth > event.depth) {
    storageStack.stack.pop();
  }
  if (storageStack.currentDepth < event.depth) {
    storageStack.stack.push({});
  }

  storageStack.currentDepth = event.depth;

  var key;
  var value;
  switch (name) {
    case "SSTORE":
      key = to.rpcDataHexString(args[1], 64).replace("0x", "");
      value = to.rpcDataHexString(args[0], 64).replace("0x", "");
      // use Object.assign to prevent future steps from overwriting this step's storage values
      structLog.storage = Object.assign({}, storageStack.stack[storageStack.currentDepth]);

      callback(null, structLog);
      // assign after callback because this storage change actually takes
      // effect _after_ this opcode executes
      storageStack.stack[storageStack.currentDepth][key] = value;
      break;
    case "SLOAD":
      // this one's more fun, we need to get the value the contract is loading from current storage
      key = to.rpcDataHexString(args[0], 64).replace("0x", "");

      vm.stateManager.getContractStorage(event.address, "0x" + key, function(err, result) {
        if (err) {
          return callback(err);
        }

        value = to.rpcDataHexString(result, 64).replace("0x", "");
        storageStack.stack[storageStack.currentDepth][key] = value;
        // use Object.assign to prevent future steps from overwriting this step's storage values
        structLog.storage = Object.assign({}, storageStack.stack[storageStack.currentDepth]);
        callback(null, structLog);
      });
      break;
    default:
      // use Object.assign to prevent future steps from overwriting this step's storage values
      structLog.storage = Object.assign({}, storageStack.stack[storageStack.currentDepth]);
      callback(null, structLog);
  }
};

BlockchainDouble.prototype.getAccount = function(trie, address, number, callback) {
  var self = this;

  if (typeof number === "function") {
    callback = number;
    number = address;
    address = trie;
    trie = null;
  }

  this.getBlock(number, function(err, block) {
    if (err) {
      return callback(err);
    }

    if (!trie) {
      trie = self.getStateTrie(block.header.stateRoot);
    }

    trie.get(utils.toBuffer(address), function(err, data) {
      if (err) {
        return callback(err);
      }

      var account = new Account(data);

      account.exists = !!data;

      callback(null, account);
    });
  });
};

BlockchainDouble.prototype.getNonce = function(address, number, callback) {
  this.getAccount(address, number, function(err, account) {
    if (err) {
      return callback(err);
    }
    callback(null, account.nonce);
  });
};

BlockchainDouble.prototype.getBalance = function(address, number, callback) {
  this.getAccount(address, number, function(err, account) {
    if (err) {
      return callback(err);
    }

    callback(null, account.balance);
  });
};

// Note! Storage values are returned RLP encoded!
BlockchainDouble.prototype.getStorage = function(address, position, number, callback) {
  var self = this;

  this.getBlock(number, function(err, block) {
    if (err) {
      return callback(err);
    }

    var trie = self.getStateTrie(block.header.stateRoot);

    trie.get(utils.toBuffer(address), function(err, data) {
      if (err != null) {
        return callback(err);
      }

      var account = new Account(data);

      trie.root = account.stateRoot;

      trie.get(utils.setLengthLeft(utils.toBuffer(position), 32), function(err, value) {
        if (err != null) {
          return callback(err);
        }

        callback(null, value);
      });
    });
  });
};

BlockchainDouble.prototype.getCode = function(address, number, callback) {
  var self = this;

  this.getBlock(number, function(err, block) {
    if (err) {
      return callback(err);
    }

    var trie = self.getStateTrie(block.header.stateRoot);

    trie.get(utils.toBuffer(address), function(err, data) {
      if (err != null) {
        return callback(err);
      }

      var account = new Account(data);

      account.getCode(trie, function(err, code) {
        if (err) {
          return callback(err);
        }

        callback(null, code);
      });
    });
  });
};

BlockchainDouble.prototype.getTransaction = function(hash, callback) {
  hash = to.hex(hash);

  this.database.transactions.get(hash, function(err, tx) {
    if (err) {
      if (err.notFound) {
        return callback(null, null);
      } else {
        return callback(err);
      }
    }
    callback(null, tx);
  });
};

BlockchainDouble.prototype.getTransactionReceipt = function(hash, callback) {
  hash = to.hex(hash);

  this.database.transactionReceipts.get(hash, function(err, receipt) {
    if (err) {
      if (err.notFound) {
        return callback(null, null);
      } else {
        return callback(err);
      }
    }

    callback(err, receipt);
  });
};

BlockchainDouble.prototype.getBlockLogs = function(number, callback) {
  var self = this;
  this.getEffectiveBlockNumber(number, function(err, effective) {
    if (err) {
      return callback(err);
    }
    self.database.blockLogs.get(effective, callback);
  });
};

BlockchainDouble.prototype.getHeight = function(callback) {
  this.database.blocks.length(function(err, length) {
    if (err) {
      return callback(err);
    }
    callback(null, length - 1);
  });
};

BlockchainDouble.prototype.currentTime = function() {
  return ((new Date().getTime() / 1000) | 0) + this.timeAdjustment;
};

BlockchainDouble.prototype.increaseTime = function(seconds) {
  if (seconds < 0) {
    seconds = 0;
  }
  this.timeAdjustment += seconds;
  return this.timeAdjustment;
};

BlockchainDouble.prototype.setTime = function(date) {
  var now = (new Date().getTime() / 1000) | 0;
  var start = (date.getTime() / 1000) | 0;
  this.timeAdjustment = start - now;
};

BlockchainDouble.prototype.close = function(callback) {
  this.database.close(callback);
};

module.exports = BlockchainDouble;
