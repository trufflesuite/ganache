var inherits = require("util").inherits;
var to = require("./utils/to.js");
var Account = require('ethereumjs-account');
var Block = require('ethereumjs-block');
var Log = require("./utils/log");
var Receipt = require("./utils/receipt");
var VM = require('ethereumjs-vm');
var RuntimeError = require("./utils/runtimeerror");
var Trie = require("merkle-patricia-tree");
var Web3 = require("web3");
var utils = require("ethereumjs-util");
var async = require('async');
var Heap = require("heap");
var Database = require("./database");
var path = require("path");
var clone = require("clone");

function BlockchainDouble(options) {
  var self = this;

  options = options || {};

  this.options = options;
  this.logger = options.logger || console;

  this.data = new Database(options);

  if (options.trie != null && options.db_path != null) {
    throw new Error("Can't initialize a TestRPC with a db and a custom trie.");
  }

  this.pending_transactions = [];

  // updated periodically to keep up with the times
  this.blockGasLimit = options.gasLimit || "0x6691b7";
  this.defaultTransactionGasLimit = '0x15f90';
  this.timeAdjustment = 0;
};

BlockchainDouble.prototype.initialize = function(accounts, callback) {
  var self = this;

  this.data.initialize(function(err) {
    if (err) return callback(err);

    self.latestBlock(function(err, block) {
      if (err) return callback(err);

      var options = self.options;

      var root = null;

      if (block) {
        root = block.header.stateRoot;
      }

      // I haven't yet found a good way to do this. Getting the trie from the
      // forked blockchain without going through the other setup is a little gross.
      self.stateTrie = self.createStateTrie(self.data.trie_db, root);

      self.vm = options.vm || new VM({
        state: self.stateTrie,
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
              number = to.number(number)
            } catch (e) {
              // Do nothing; must be a block hash. 
            }

            self.getBlock(number, done)
          } 
        },
        enableHomestead: true,
        activatePrecompiles: true
      });

      if (options.debug == true) {
        self.vm.on('step', function(info){
          self.logger.log(info.opcode.name)
        });
      }

      if (options.time) {
        self.setTime(options.time);
      }

      // If we already have a block, then that means there's an existing chain.
      // Don't create a genesis block.
      if (block) {
        return callback();
      }

      self.createGenesisBlock(function(err, block) {
        if (err) return callback(err);

        accounts = accounts || [];

        async.eachSeries(accounts, function(account_data, finished) {
          self.putAccount(account_data.account, account_data.address, finished);
        }, function(err) {
          if (err) return callback(err);

          // Create first block
          self.putBlock(block, [], [], callback);
        });
      });
    });

  });
};

BlockchainDouble.prototype.createStateTrie = function(db, root) {
  return new Trie(this.data.trie_db, root);
};

// Overrideable so other implementations (forking) can edit it.
BlockchainDouble.prototype.createGenesisBlock = function(callback) {
  this.createBlock(callback);
};

BlockchainDouble.prototype.latestBlock = function(callback) {
  this.data.blocks.last(function(err, last) {
    if (err) return callback(err);
    callback(null, last);
  });
}

// number accepts number (integer, hex) or tag (e.g., "latest")
BlockchainDouble.prototype.getEffectiveBlockNumber = function(number, callback) {
  if (typeof number != "string") {
    number = to.hex(number);
  }

  // If we have a hex number
  if (number.indexOf("0x") >= 0) {
    return callback(null, to.number(number));
  } else {
    if (number == "latest" || number == "pending") {
      return this.getHeight(callback);
    } else if (number == "earliest") {
      return callback(null, 0);
    }
  }
};

// number accepts number (integer, hex), tag (e.g., "latest") or block hash
// This function is used by ethereumjs-vm
BlockchainDouble.prototype.getBlock = function(number, callback) {
  var self = this;

  if (typeof number != "string") {
    number = to.hex(number);
  }

  // If we have a hex number or a block hash
  if (number.indexOf("0x") >= 0) {
    var hash = number;

    // block hash
    if (hash.length > 40) {
      this.data.blockHashes.get(to.hex(hash), function(err, blockIndex) {
        if (err) return callback(err);
        return self.data.blocks.get(blockIndex, callback);
      });
    } else {
      // Block number
      return this.data.blocks.get(to.number(hash), callback);
    }
  } else {
    if (number == "latest" || number == "pending") {
      return this.latestBlock(callback);
    } else if (number == "earliest") {
      return this.data.blocks.first(callback);
    }
  }
};

BlockchainDouble.prototype.putBlock = function(block, logs, receipts, callback) {
  var self = this;

  // Lock in the state root for this block.
  block.header.stateRoot = this.stateTrie.root;

  this.data.blocks.length(function(err, length) {
    if (err) return callback(err);

    var requests = [
      self.data.blocks.push.bind(self.data.blocks, block),
      self.data.blockLogs.push.bind(self.data.blockLogs, logs),
      self.data.blockHashes.set.bind(self.data.blockHashes, to.hex(block.hash()), length),
    ];

    block.transactions.forEach(function(tx, index) {
      var tx_hash = to.hex(tx.hash());

      requests.push(
        self.data.transactions.set.bind(self.data.transactions, tx_hash, tx),
        self.data.transactionReceipts.set.bind(self.data.transactionReceipts, tx_hash, receipts[index])
      );
    });

    async.parallel(requests, callback);
  });
};

BlockchainDouble.prototype.popBlock = function(callback) {
  var self = this;

  this.data.blocks.last(function(err, block) {
    if (err) return callback(err);
    if (block == null) return callback(null, null);

    var requests = [];
    var blockHash = to.hex(block.hash());

    block.transactions.forEach(function(tx, index) {
      var tx_hash = to.hex(tx.hash());

      requests.push(
        self.data.transactions.del.bind(self.data.transactions, tx_hash),
        self.data.transactionReceipts.del.bind(self.data.transactionReceipts, tx_hash)
      );
    });

    requests.push(
      self.data.blockLogs.pop.bind(self.data.blockLogs),
      self.data.blockHashes.del.bind(self.data.blockHashes, blockHash),
      self.data.blocks.pop.bind(self.data.blocks) // Do this one last in case anything relies on it.
    );

    async.series(requests, function(err) {
      if (err) return callback(err);

      // Set the root to the last available, which will "roll back" to the previous
      // moment in time. Note that all the old data is still in the db, but it's now just junk data.
      self.data.blocks.last(function(err, newLastBlock) {
        if (err) return callback(err);
        self.stateTrie.root = newLastBlock.header.stateRoot;
        // Remember: Return block we popped off.
        callback(null, block);
      });
    });
  });
};

BlockchainDouble.prototype.clearPendingTransactions = function() {
  this.pending_transactions = [];
};

BlockchainDouble.prototype.putAccount = function(account, address, callback) {
  var self = this;

  address = utils.toBuffer(address);

  this.vm.stateManager._putAccount(address, account, function(err) {
    if (err) return callback(err);

    self.vm.stateManager.cache.flush(callback);
  });
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

  if (typeof parent == "function") {
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
  };

  getParent(function(err, parent) {
    if (err) return callback(err);

    var parentNumber = parent != null ? to.number(parent.header.number) : -1;

    block.header.gasLimit = self.blockGasLimit;

    // Ensure we have the right block number for the VM.
    block.header.number = to.hex(parentNumber + 1);

    // Set the timestamp before processing txs
    block.header.timestamp = to.hex(self.currentTime());

    if (parent != null) {
      block.header.parentHash = to.hex(parent.hash());
    }

    callback(null, block);
  });
};

BlockchainDouble.prototype.getQueuedNonce = function(address, callback) {
  var nonce = null;

  this.pending_transactions.forEach(function(tx) {
    //tx.from and address are buffers, so cannot simply do
    //tx.from==address
    if (to.hex(tx.from) != to.hex(address)) return;

    var pending_nonce = to.number(tx.nonce);
    //If this is the first queued nonce for this address we found,
    //or it's higher than the previous highest, note it.
    if (nonce===null || pending_nonce > nonce) {
      nonce = pending_nonce;
    }
  });

  //If we found a queued transaction nonce, return one higher
  //than the highest we found
  if (nonce!=null) return callback(null, nonce+1);

  this.stateTrie.get(address, function(err, val) {
    if (err) return callback(err);

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
  for (idx in self.pending_transactions){
    var tx = self.pending_transactions[idx]
    if (!sortedByNonce[to.hex(tx.from)]){
      sortedByNonce[to.hex(tx.from)] = [tx];
    } else {
      Array.prototype.push.apply(sortedByNonce[to.hex(tx.from)], [tx]);
    }
  }
  var priceSort = function(a,b){
    return parseInt(to.hex(b.gasPrice),16)-parseInt(to.hex(a.gasPrice),16);
  }
  var nonceSort = function(a,b){
    return parseInt(to.hex(a.nonce),16) - parseInt(to.hex(b.nonce),16)
  }

  // Now sort each address by nonce
  for (address in sortedByNonce){
    Array.prototype.sort.apply(sortedByNonce[address], [nonceSort])
  }

  // Initialise a heap, sorted by price, for the head transaction from each account.
  var heap = new Heap(priceSort);
  for (address in sortedByNonce){
    heap.push(sortedByNonce[address][0]);
    //Remove the transaction from sortedByNonce
    sortedByNonce[address].splice(0,1);
  }

  // Now reorder our transactions. Compare the next transactions from each account, and choose
  // the one with the highest gas price.
  sorted_transactions = [];
  while (heap.size()>0){
    best = heap.pop();
    if (sortedByNonce[to.hex(best.from)].length>0){
      //Push on the next transaction from this account
      heap.push(sortedByNonce[address][0]);
      sortedByNonce[address].splice(0,1);
    }
    Array.prototype.push.apply(sorted_transactions, [best]);
  }
  self.pending_transactions = sorted_transactions;
};

BlockchainDouble.prototype.processCall = function(tx, callback) {
    var self = this;

    // create a fake block with this fake transaction
    var block = new Block();
    block.transactions.push(tx);

    self.latestBlock(function (err, latestBlock) {
      if (err) {
        return callback(err);
      }

      // we need to fake out the block number as if it were the current block
      // as otherwise the VM will report that it's operating on a block which
      // doesn't exist
      block.header = clone(latestBlock.header, false);

      // We checkpoint here for speed. We want all state trie reads/writes to happen in memory,
      // and the final output be flushed to the database at the end of transaction processing.
      self.vm.stateManager.checkpoint();

      var cleanUpAndReturn = function (err, result) {
        self.vm.stateManager.revert(function (e) {
          callback(err || e, result);
        });
      };

      var runArgs = {
        tx: tx,
        block: block,
        skipBalance: true,
        skipNonce: true
      };

      self.vm.runTx(runArgs, function (vmerr, result) {
        // This is a check that has been in there for awhile. I'm unsure if it's required, but it can't hurt.
        if (vmerr && vmerr instanceof Error == false) {
          vmerr = new Error("VM error: " + vmerr);
        }

        // If we're given an error back directly, it's worse than a runtime error. Expose it and get out.
        if (vmerr) return cleanUpAndReturn(vmerr);

        // If no error, check for a runtime error. This can return null if no runtime error.
        vmerr = RuntimeError.fromResults([tx], { results: [result] });

        cleanUpAndReturn(vmerr, result);
      });
    });
}

/**
 * processBlock
 *
 * Process the passed in block and included transactions
 *
 * @param  {Block} block       block to process
 * @param  {Boolean} commit    Whether or not changes should be committed to the state trie and the block appended to the end of the chain.
 * @param  {Function} callback Callback function when transaction processing is completed.
 * @return [type]              [description]
 */
BlockchainDouble.prototype.processBlock = function(block, commit, callback) {
  var self = this;

  if (typeof commit == "function") {
    callback = commit;
    commit = true;
  }

  var currentStateRoot = self.stateTrie.root;

  // We checkpoint here for speed. We want all state trie reads/writes to happen in memory,
  // and the final output be flushed to the database at the end of transaction processing.
  self.vm.stateManager.checkpoint();

  var cleanup = function(err) {
    self.vm.stateManager.revert(function(e) {
      callback(err || e);
    });
  };

  self.vm.runBlock({
    block: block,
    generate: true,
  }, function(vmerr, results) {
    // This is a check that has been in there for awhile. I'm unsure if it's required, but it can't hurt.
    if (vmerr && vmerr instanceof Error == false) {
      vmerr = new Error("VM error: " + vmerr);
    }

    // If we're given an error back directly, it's worse than a runtime error. Expose it and get out.
    if (vmerr) return cleanup(vmerr);

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
      var tx_hash = tx.hash();
      var tx_logs = [];

      // Only process the transaction's logs if it didn't error.
      if (result.vm.exception == 1) {
        for (var i = 0; i < receipt.logs.length; i++) {
          var log = receipt.logs[i];
          var address = to.hex(log[0]);
          var topics = []

          for (var j = 0; j < log[1].length; j++) {
            topics.push(to.hex(log[1][j]));
          }

          var data = to.hex(log[2]);

          var log = new Log({
            logIndex: to.hex(i),
            transactionIndex: to.hex(v),
            transactionHash: tx_hash,
            block: block,
            address: address,
            data: data,
            topics: topics,
            type: "mined"
          });

          logs.push(log);
          tx_logs.push(log);
        }
      }

      receipts.push(new Receipt(tx, block, tx_logs, receipt.gasUsed, result.createdAddress, receipt.status));
    }

    function commmitIfNeeded(cb) {
      if (commit === true) {
        self.vm.stateManager.commit(function(e) {
          if (e) return cleanup(e);

          // Put that block on the end the chain
          self.putBlock(block, logs, receipts, cb);
        });
      } else {
        self.vm.stateManager.revert(cb);
      }
    }

    commmitIfNeeded(function(e) {
      if (e) return callback(e);
      // Note we return the vm err here too, if it exists.
      callback(vmerr, block.transactions, results);
    });
  });
};

/**
 * processNextBlock
 *
 * Process the next block like a normal blockchain, pulling from the list of
 * pending transactions.
 *
 * @param  {Function} callback Callback when transaction processing is finished.
 * @return [type]              [description]
 */
BlockchainDouble.prototype.processNextBlock = function(callback) {
  var self = this;

  self.sortByPriceAndNonce();

  var successfullyAddedTransactions = [];

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
  if (currentTransactions.length == 0 && self.pending_transactions.length > 0) {
    // Error like geth.
    return callback("Unexpected error condition: next transaction exceeds block gas limit")
  }

  // Create a new block meant to be the end of the chain
  this.createBlock(function(err, block) {
    if (err) return callback(err);

    // Add transactions to the block.
    Array.prototype.push.apply(block.transactions, currentTransactions);

    // Process the block, committing the block to the chain
    self.processBlock(block, true, callback);
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
 *  2. Set state root of that block
 *  3. Rerun every transaction in that block prior to and including the requested transaction
 *  4. Reset state root back to original
 *  5. Send trace results back.
 *
 * @param  {[type]}   tx       [description]
 * @param  {Function} callback [description]
 * @return [type]              [description]
 */
BlockchainDouble.prototype.processTransactionTrace = function(hash, params, callback) {
  var self = this;
  var target_hash = to.hex(hash);
  var tx_hash_currently_processing = "";
  var tx_currently_processing = null;

  var returnVal = {
    gas: 0,
    returnValue: "",
    structLogs: []
  };

  function step_listener(event) {
    // See these docs:
    // https://github.com/ethereum/go-ethereum/wiki/Management-APIs

    var gasLeft = to.number(event.gasLeft);
    var totalGasUsedAfterThisStep = to.number(tx_currently_processing.gasLimit) - gasLeft;
    var gasUsedThisStep = totalGasUsedAfterThisStep - returnVal.gas;
    returnVal.gas += gasUsedThisStep;

    // Get memory and break it up into 32-byte words.
    // Note we may possibly have to pad the final word.
    var memory = (new Buffer(event.memory)).toString("hex");
    memory = memory.match(/.{1,64}/g) || [];

    if (memory.length > 0) {
      var lastItem = memory[memory.length - 1];
      if (lastItem.length < 64) {
        memory[memory.length - 1] = lastItem + new Array(64 - lastItem.length + 1).join("0");
      }
    }

    var structLog = {
      depth: event.depth,
      error: "",
      gas: gasLeft,
      gasCost: gasUsedThisStep,
      memory: memory,
      op: event.opcode.name,
      pc: event.pc,
      stack: event.stack.map(function(item) {
        return item.toString("hex"); // non-0x prefixed.
      }),
      storage: {} // TODO: Figure out storage
    }

    returnVal.structLogs.push(structLog);
  }

  function beforeTx_listener(tx) {
    tx_currently_processing = tx;
    tx_hash_currently_processing = to.hex(tx.hash());

    if (tx_hash_currently_processing == target_hash) {
      self.vm.on("step", step_listener);
    }
  }

  // afterTx_listener cleans up everything.
  function afterTx_listener() {
    if (tx_hash_currently_processing == target_hash) {
      self.vm.removeListener("step", step_listener);
      self.vm.removeListener("beforeTx", beforeTx_listener);
      self.vm.removeListener("afterTx", afterTx_listener);
    }
  }

  // Listen to beforeTx and afterTx so we know when our target transaction
  // is processing. These events will add the vent listener for getting the trace data.
  self.vm.on("beforeTx", beforeTx_listener);
  self.vm.on("afterTx", afterTx_listener);

  // #1 - get block via transaction receipt
  this.getTransactionReceipt(target_hash, function(err, receipt) {
    if (err) return callback(err);

    if (!receipt) {
      return callback(new Error("Unknown transaction " + target_hash));
    }

    var targetBlock = receipt.block;

    // Get the parent of the target block
    self.getBlock(targetBlock.header.parentHash, function(err, parent) {
      if (err) return callback(err);

      var startingStateRoot = self.stateTrie.root;

      // #2 - Set state root of original block
      self.stateTrie.root = parent.header.stateRoot;

      // Prepare the "next" block with necessary transactions
      self.createBlock(parent, function(err, block) {
        if (err) return callback(err);

        for (var i = 0; i < targetBlock.transactions.length; i++) {
          var tx = targetBlock.transactions[i];
          block.transactions.push(tx)

          // After including the target transaction, that's all we need to do.
          if (to.hex(tx.hash()) == target_hash) {
            break;
          }
        }

        // #3 - Process the block without committing the data.
        self.processBlock(block, false, function(err, transactions, results) {
          // Ignore runtime errors, or else erroneous transactions can't be traced.
          if (err && err.message.indexOf("VM Exception") == 0) {
            err = null;
          }

          // #4 - reset the state root.
          self.stateTrie.root = startingStateRoot;

          // Just to be safe
          self.vm.removeListener("beforeTx", beforeTx_listener);
          self.vm.removeListener("afterTx", afterTx_listener);
          self.vm.removeListener("step", step_listener);

          // #5 - send state results back
          callback(err, returnVal);
        });
      });
    });
  });
};

BlockchainDouble.prototype.getAccount = function(address, number, callback) {
  var self = this;

  this.getBlock(number, function(err, block) {
    if (err) return callback(err);

    var trie = self.stateTrie;

    // Manipulate the state root in place to maintain checkpoints
    var currentStateRoot = trie.root;
    self.stateTrie.root = block.header.stateRoot;

    trie.get(utils.toBuffer(address), function(err, data) {
      // Finally, put the stateRoot back for good
      trie.root = currentStateRoot;

      if (err) return callback(err);

      var account = new Account(data);

      account.exists = !!data;

      callback(null, account);
    });
  });
};

BlockchainDouble.prototype.getNonce = function(address, number, callback) {
  this.getAccount(address, number, function(err, account) {
    if (err) return callback(err);
    callback(null, account.nonce);
  });
};

BlockchainDouble.prototype.getBalance = function(address, number, callback) {
  this.getAccount(address, number, function(err, account) {
    if (err) return callback(err);

    callback(null, account.balance);
  });
};

// Note! Storage values are returned RLP encoded!
BlockchainDouble.prototype.getStorage = function(address, position, number, callback) {
  var self = this;

  this.getBlock(number, function(err, block) {
    if (err) return callback(err);

    var trie = self.stateTrie;

    // Manipulate the state root in place to maintain checkpoints
    var currentStateRoot = trie.root;
    self.stateTrie.root = block.header.stateRoot;

    trie.get(utils.toBuffer(address), function(err, data) {
      if (err != null) {
        // Put the stateRoot back if there's an error
        trie.root = currentStateRoot;
        return callback(err);
      }

      var account = new Account(data);

      trie.root = account.stateRoot;

      trie.get(utils.setLengthLeft(utils.toBuffer(position), 32), function(err, value) {
        // Finally, put the stateRoot back for good
        trie.root = currentStateRoot;

        if (err != null) {
          return callback(err);
        }

        callback(null, value);
      });

    });
  });
}

BlockchainDouble.prototype.getCode = function(address, number, callback) {
  var self = this;

  this.getBlock(number, function(err, block) {
    if (err) return callback(err);

    var trie = self.stateTrie;

    // Manipulate the state root in place to maintain checkpoints
    var currentStateRoot = trie.root;
    self.stateTrie.root = block.header.stateRoot;

    trie.get(utils.toBuffer(address), function(err, data) {
      if (err != null) {
        // Put the stateRoot back if there's an error
        trie.root = currentStateRoot;
        return callback(err);
      }

      var account = new Account(data);

      account.getCode(trie, function(err, code) {
        // Finally, put the stateRoot back for good
        trie.root = currentStateRoot;

        if (err) return callback(err);

        callback(null, code);
      });
    });
  });
};

BlockchainDouble.prototype.getTransaction = function(hash, callback) {
  hash = to.hex(hash);

  this.data.transactions.get(hash, function(err, tx) {
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

  this.data.transactionReceipts.get(hash, function(err, receipt) {
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
    if (err) return callback(err);
    self.data.blockLogs.get(effective, callback);
  });
};

BlockchainDouble.prototype.getHeight = function(callback) {
  this.data.blocks.length(function(err, length) {
    if (err) return callback(err);
    callback(null, length - 1);
  })
};

BlockchainDouble.prototype.currentTime = function() {
  return (new Date().getTime() / 1000 | 0) + this.timeAdjustment;
};

BlockchainDouble.prototype.increaseTime = function(seconds) {
  if (seconds < 0) seconds = 0;
  this.timeAdjustment += seconds;
  return this.timeAdjustment;
};

BlockchainDouble.prototype.setTime = function(date) {
  var now = new Date().getTime() / 1000 | 0;
  var start = date.getTime() / 1000 | 0;
  this.timeAdjustment = start - now;
};

BlockchainDouble.prototype.close = function(callback) {
  this.data.close(callback);
};

module.exports = BlockchainDouble;
