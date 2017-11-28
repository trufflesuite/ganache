var Account = require('ethereumjs-account');
var Block = require('ethereumjs-block');
var VM = require('ethereumjs-vm');
var RuntimeError = require('./utils/runtimeerror');
var Trie = require('merkle-patricia-tree');
var FakeTransaction = require('ethereumjs-tx/fake.js');
var utils = require('ethereumjs-util');
var seedrandom = require('seedrandom');
var bip39 = require('bip39');
var wallet = require('ethereumjs-wallet');
var hdkey = require('ethereumjs-wallet/hdkey');
var async = require("async");
var BlockchainDouble = require("./blockchain_double.js");
var ForkedBlockchain = require("./utils/forkedblockchain.js");
var Web3 = require('web3');
var async = require("async");
var util = require("util");

var to = require('./utils/to');
var random = require('./utils/random');
var txhelper = require('./utils/txhelper');

StateManager = function(options) {
  var self = this;

  if (options == null) {
    options = {};
  }

  if (options.fork) {
    this.blockchain = new ForkedBlockchain(options);
  } else {
    this.blockchain = new BlockchainDouble(options);
  }

  this.vm = this.blockchain.vm;
  this.stateTrie = this.blockchain.stateTrie;

  this.accounts = {};
  this.secure = !!options.secure;
  this.account_passwords = {}
  this.personal_accounts = {}
  this.total_accounts = options.total_accounts || 10;
  this.coinbase = null;

  this.latest_filter_id = 1;

  // This queue manages actions that shouldn't be run in parallel.
  // The action_processing flag ensures new actions are queued instead of
  // run immediately.
  this.action_queue = [];
  this.action_processing == false;

  this.snapshots = [];
  this.logger = options.logger || console;
  this.net_version = options.network_id;
  this.rng = seedrandom(options.seed);
  this.mnemonic = options.mnemonic || bip39.entropyToMnemonic(random.randomBytes(16, this.rng).toString("hex"));
  this.wallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(this.mnemonic));
  this.wallet_hdpath = "m/44'/60'/0'/0/";

  this.gasPriceVal = '0x4A817C800'; // 0.02 szabo

  if (options.gasPrice != null) {
    this.gasPriceVal = utils.stripHexPrefix(utils.intToHex(options.gasPrice));
  }

  this.is_mining = true;
  this.blocktime = options.blocktime;
  this.is_mining_on_interval = !!options.blocktime;
  this.mining_interval_timeout = null;
}

StateManager.prototype.initialize = function(options, callback) {
  var self = this;

  var accounts = [];

  if (options.accounts) {
    accounts = options.accounts.map(this.createAccount.bind(this));
  } else {
    for (var i = 0; i < this.total_accounts; i++) {
      accounts.push(self.createAccount({
        index: i
      }));
    }
  }

  this.coinbase = to.hex(accounts[0].address);
  this.accounts = {};

  accounts.forEach(function(data) {
    self.accounts[data.address] = data;
  });

  // Turn array into object, mostly for speed purposes.
  // No need for caller to specify private keys.
  this.unlocked_accounts = (options.unlocked_accounts || []).reduce(function(obj, address) {
    // If it doesn't have a hex prefix, must be a number (either a string or number type).
    if ((address + "").indexOf("0x") != 0) {
      address = accounts[parseInt(address)].address;
    }

    obj[address.toLowerCase()] = true; // can be any value
    return obj;
  }, {});

  if (!this.secure) {
    accounts.forEach(function(data) {
      self.unlocked_accounts[data.address] = data;
    });
  }

  this.blockchain.initialize(accounts, function(err) {
    if (err) return callback(err);

    // If the user didn't pass a specific version id in, then use the
    // forked blockchain's version (if it exists) or create our own.
    if (!self.net_version) {
      self.net_version = self.blockchain.fork_version || new Date().getTime();
    }

    if (self.is_mining_on_interval) {
      self.mineOnInterval();
    }

    callback();
  });
};

StateManager.prototype.mineOnInterval = function() {
  var self = this;

  // For good measure.
  clearTimeout(self.mining_interval_timeout);
  self.mining_interval_timeout = null;

  self.mining_interval_timeout = setTimeout(function() {
    self.action_queue.push({
      method: function() {
        // Only process one block.
        self.processBlocks(1, function(err) {
          // Note: Errors are ignored as they're printed to the log
        });
      },
      callback: self.mineOnInterval.bind(self)
    });

    self.processNextAction();
  }, this.blocktime * 1000);

  // Ensure this won't keep a node process open.
  if (this.mining_interval_timeout.unref) {
    this.mining_interval_timeout.unref();
  }
};

StateManager.prototype.createAccount = function(opts, i) {
  var secretKey;
  var balance;

  if (opts.generate) {
    secretKey = wallet.generate().getPrivateKey();
  } else if (opts.secretKey) {
    secretKey = utils.toBuffer(to.hex(opts.secretKey));
  } else {
    var index = (typeof(opts.index) === 'undefined') ? i : opts.index;
    var acct = this.wallet.derivePath(this.wallet_hdpath + index) // index is a number
    secretKey = acct.getWallet().getPrivateKey() // Buffer
  }

  var publicKey = utils.privateToPublic(secretKey);
  var address = utils.publicToAddress(publicKey);

  var account = new Account();

  if (opts.balance) {
    account.balance = to.hex(opts.balance)
  } else {
    account.balance = "0x0000000000000056bc75e2d63100000";
  }

  var data = {
    secretKey: secretKey,
    publicKey: publicKey,
    address: to.hex(address),
    account: account
  };

  return data;
};

StateManager.prototype.blockNumber = function(callback) {
  return this.blockchain.getHeight(callback);
};

StateManager.prototype.gasPrice = function() {
  return this.gasPriceVal;
}

StateManager.prototype.getBalance = function(address, number, callback) {
  this.blockchain.getBalance(address, number, function(err, balance) {
    if (balance) {
      balance = to.hex(balance);
    }
    callback(err, balance);
  });
}

StateManager.prototype.getTransactionCount = function(address, number, callback) {
  this.blockchain.getNonce(address, number, function(err, nonce) {
    if (nonce) {
      nonce = to.hex(nonce);
    }
    callback(err, nonce);
  });
}

StateManager.prototype.getCode = function(address, number, callback) {
  this.blockchain.getCode(address, number, function(err, code) {
    if (code) {
      code = to.hex(code);
    }
    callback(err, code);
  });
}

StateManager.prototype.queueRawTransaction = function(rawTx, callback) {
  var data = new Buffer(utils.stripHexPrefix(rawTx), 'hex');

  var tx = new FakeTransaction(data);
  var txParams = {
    from:     tx.from.toString('hex'),
    to:       tx.to.toString('hex'),
    gas:      tx.gasLimit.toString('hex'),
    gasPrice: tx.gasPrice.toString('hex'),
    value:    tx.value.toString('hex'),
    data:     tx.data.toString('hex'),
    nonce:    tx.nonce.toString('hex'),
  }

  this.queueTransaction("eth_sendRawTransaction", txParams, callback);
};

StateManager.prototype.queueStorage = function(address, position, block, callback) {
  this.action_queue.push({
    method: "eth_getStorageAt",
    address: utils.addHexPrefix(address),
    position: utils.addHexPrefix(position),
    block: block,
    callback: callback
  });

  // We know there's work, so get started.
  this.processNextAction();
}

StateManager.prototype.queueTransaction = function(method, tx_params, callback) {
  if (tx_params.from == null) {
    callback(new Error("from not found; is required"));
    return;
  }

  // use toLowerCase() to properly handle from addresses meant to be validated.
  tx_params.from = utils.addHexPrefix(tx_params.from).toLowerCase();

  if (method == "eth_sendTransaction" && this.unlocked_accounts[tx_params.from] == null) {
    return callback(new Error("could not unlock signer account"));
  }

  var rawTx = {
      gasPrice: "0x1",
      gasLimit: this.blockchain.defaultTransactionGasLimit,
      value: '0x0',
      data: ''
  };

  if (tx_params.gas != null) {
    rawTx.gasLimit = utils.addHexPrefix(tx_params.gas);
  }

  if (tx_params.gasPrice != null) {
    rawTx.gasPrice = utils.addHexPrefix(tx_params.gasPrice);
  }

  if (tx_params.to != null) {
    rawTx.to = utils.addHexPrefix(tx_params.to);
  }

  if (tx_params.value != null) {
    rawTx.value = utils.addHexPrefix(tx_params.value);
  }

  if (tx_params.data != null) {
    rawTx.data = utils.addHexPrefix(tx_params.data);
  }

  if (tx_params.nonce != null) {
    rawTx.nonce = utils.addHexPrefix(tx_params.nonce);
  }

  // Error checks
  if (rawTx.to && typeof rawTx.to != "string") {
    return callback(new Error("Invalid to address"));
  }

  // If the transaction has a higher gas limit than the block gas limit, error.
  if (to.number(rawTx.gasLimit) > to.number(this.blockchain.blockGasLimit)) {
    return callback(new Error("Exceeds block gas limit"));
  }

  // Get the nonce for this address, taking account any transactions already queued.
  var self = this;
  var address = utils.toBuffer(tx_params.from);
  this.blockchain.getQueuedNonce(address, function(err, nonce) {
    // If the user specified a nonce, use that instead.
    if (rawTx.nonce == null) {
      rawTx.nonce = to.hex(nonce);
    }

    // Edit: Why is this here?
    if (rawTx.to == '0x0') {
      delete rawTx.to
    }

    var tx = new FakeTransaction(rawTx);
    tx.from = address;

    self.action_queue.push({
      method: method,
      from: tx_params.from,
      tx: tx,
      callback: callback
    });

    // We know there's work, so get started.
    self.processNextAction();
  });
};

StateManager.prototype.queueTransactionTrace = function(tx_hash, params, callback) {
  this.action_queue.push({
    method: "debug_traceTransaction",
    hash: to.hex(tx_hash),
    params: params,
    callback: callback
  });

  // We know there's work, so get started.
  this.processNextAction();
};

StateManager.prototype.processNextAction = function(override) {
  var self = this;

  if (override != true) {
    if (this.action_processing == true || this.action_queue.length == 0) {
      return;
    }
  }

  var queued = this.action_queue.shift();

  // Set the flag that we're currently processing something.
  this.action_processing = true;

  var intermediary = function(err, result) {
    queued.callback(err, result);

    if (self.action_queue.length > 0) {
      self.processNextAction(true);
    } else {
      self.action_processing = false;
    }
  };

  if (typeof queued.method == "function") {
    var result = queued.method();
    return intermediary(null, result);
  } else if (queued.method == "eth_getStorageAt") {
    this.blockchain.getStorage(queued.address, queued.position, queued.block, function(err, result) {
      if (err) return intermediary(err);

      if (result) {
        result = utils.rlp.decode(result);
      }

      result = to.hex(result || 0);
      intermediary(null, result);
    });
  } else if (queued.method == "debug_traceTransaction") {
    this.blockchain.processTransactionTrace(queued.hash, queued.params, intermediary);
  } else if (queued.method == "eth_sendTransaction" || queued.method == "eth_sendRawTransaction") {
    this.processTransaction(queued.from, queued.tx, intermediary);
  } else if (queued.method == "eth_call") {
    this.processCall(queued.from, queued.tx, intermediary);
  } else if (queued.method == "eth_estimateGas") {
    this.processGasEstimate(queued.from, queued.tx, intermediary);
  }
};

StateManager.prototype.sign = function(address, dataToSign) {
  var account = this.accounts[to.hex(address)];

  if (!account) {
    throw new Error("cannot sign data; no private key");
  }

  var secretKey = account.secretKey;
  var msg = new Buffer(dataToSign.replace('0x',''), 'hex');
  var msgHash = utils.hashPersonalMessage(msg);
  var sgn = utils.ecsign(msgHash, new Buffer(secretKey));
  return utils.toRpcSig(sgn.v, sgn.r, sgn.s);
};

StateManager.prototype.printTransactionReceipt = function(tx_hash, error, callback){
  var self = this;

  self.blockchain.getTransactionReceipt(tx_hash, function(err, receipt) {
    if (err) return callback(err);

    self.blockchain.latestBlock(function(err, block) {
      if (err) return callback(err);

      receipt = receipt.toJSON();

      self.logger.log("");
      self.logger.log("  Transaction: " + tx_hash);

      if (receipt.contractAddress != null) {
        self.logger.log("  Contract created: " + receipt.contractAddress);
      }

      self.logger.log("  Gas usage: " + parseInt(receipt.gasUsed, 16));
      self.logger.log("  Block Number: " + parseInt(receipt.blockNumber, 16));
      self.logger.log("  Block Time: " + new Date(to.number(block.header.timestamp) * 1000).toString());

      if (error) {
        self.logger.log("  Runtime Error: " + error.error);
      }

      self.logger.log("");

      callback(null, tx_hash);
    });
  });
}

StateManager.prototype.processBlocks = function(total_blocks, callback) {
  var self = this;

  if (typeof total_blocks == "function") {
    callback = total_blocks;
    total_blocks = null;
  }

  // Note: VM errors (errors that the VM directly returns) trump all runtime errors.
  var runtime_error = null;
  var amount_processed = 0;

  async.whilst(function() {
    var shouldContinue;

    if (total_blocks == null) {
      shouldContinue = self.blockchain.pending_transactions.length > 0;
    } else {
      shouldContinue = amount_processed < total_blocks;
    }

    return shouldContinue;
  }, function(done) {
    self.blockchain.processNextBlock(function(err, transactions, vm_output) {
      amount_processed += 1;

      if (err) {
        if (err instanceof RuntimeError == false) {
          // This is bad. Get out.
          return done(err);
        }

        // We must have a RuntimeError. Merge results if we've found
        // other runtime errors during this execution.
        if (runtime_error == null) {
          runtime_error = err;
        } else {
          runtime_error.combine(err);
        }
      }

      // Note we don't quit on runtime errors. We keep processing transactions.
      // Print the transaction receipts then move onto the next one.

      // TODO: Can we refactor printTransactionReceipt so it's synchronous?
      // We technically have the raw vm receipts (though they're not full receipts here...).
      var receipts = vm_output.receipts;
      async.eachSeries(transactions, function(tx, finished_printing) {
        var hash = to.hex(tx.hash());
        var error = runtime_error == null ? {results: {}} : runtime_error;
        self.printTransactionReceipt(hash, error.results[hash], finished_printing);
      }, done);
    });
  }, function(err) {
    // Remember: vm errors trump runtime errors
    callback(err || runtime_error);
  });
};

StateManager.prototype.processCall = function(from, tx, callback) {
  var self = this;

  var tx_hash = to.hex(tx.hash());
  self.blockchain.processCall(tx, function(err, results) {
      if (err) {
          return callback(err);
      }

      var result = '0x0'
      if (!results.error && results.vm.return) {
        result = to.hex(results.vm.return);
      }

      return callback(null, result);
  });
};

StateManager.prototype.processGasEstimate = function(from, tx, callback) {
  var self = this;

  var tx_hash = to.hex(tx.hash());
  self.blockchain.processCall(tx, function(err, results) {
      if (err) {
          return callback(err);
      }
      return callback(null, to.hex(results.gasUsed));
  });
}

StateManager.prototype.processTransaction = function(from, tx, callback) {
  var self = this;

  self.blockchain.queueTransaction(tx);

  var tx_hash = to.hex(tx.hash());

  // If we're not currently mining or we're mining on an interval,
  // only queue the transaction, don't process it.
  if (self.is_mining == false || self.is_mining_on_interval){
    return callback(null, tx_hash);
  }

  self.processBlocks(function(err) {
    if (err) return callback(err);
    callback(null, tx_hash);
  });
};

StateManager.prototype.getTransactionReceipt = function(hash, callback) {
  this.blockchain.getTransactionReceipt(hash, function(err, receipt) {
    if (err && err.notFound) {
      // Return null if the receipt's not found.
      return callback(null, null);
    }
    callback(err, receipt);
  });
};

StateManager.prototype.getBlock = function(hash_or_number, callback) {
  this.blockchain.getBlock(hash_or_number, callback);
};

StateManager.prototype.getLogs = function(filter, callback) {
  var self = this;

  var expectedAddress = filter.address;
  var expectedTopics = filter.topics || [];

  async.parallel({
    fromBlock: this.blockchain.getEffectiveBlockNumber.bind(this.blockchain, filter.fromBlock || "latest"),
    toBlock: this.blockchain.getEffectiveBlockNumber.bind(this.blockchain, filter.toBlock || "latest"),
    latestBlock: this.blockchain.getEffectiveBlockNumber.bind(this.blockchain, "latest")
  }, function(err, results) {
    var fromBlock = results.fromBlock;
    var toBlock = results.toBlock;
    var latestBlock = results.latestBlock;

    if (toBlock > latestBlock) {
      toBlock = latestBlock;
    }

    var logs = [];
    var current = fromBlock;

    async.whilst(function() {
      return current <= toBlock;
    }, function(finished) {
      self.blockchain.getBlockLogs(current, function(err, blockLogs) {
        if (err) return finished(err);

        // Filter logs that match the address
        var filtered = blockLogs.filter(function(log) {
          return (expectedAddress == null || log.address == expectedAddress);
        });

        // Now filter based on topics.
        filtered = filtered.filter(function(log) {
          var keep = true;
          for (var i = 0; i < expectedTopics.length; i++) {
            var expectedTopic = expectedTopics[i];
            var logTopic = log.topics[i];
            if (expectedTopic == null) continue;
            var isMatch = Array.isArray(expectedTopic)
              ? expectedTopic.includes(logTopic)
              : expectedTopic === logTopic;
            if (i >= log.topics.length || !isMatch) {
              keep = false;
              break;
            }
          }
          return keep;
        });

        logs.push.apply(logs, filtered);

        current += 1;
        finished();
      });
    }, function(err) {
      if (err) return callback(err);

      logs = logs.map(function(log) {
        return log.toJSON();
      });

      callback(err, logs);
    });

  });
};

// Note: Snapshots have 1-based ids.
StateManager.prototype.snapshot = function(callback) {
  var self = this;

  this.blockchain.getHeight(function(err, blockNumber) {
    if (err) return callback(err);

    self.snapshots.push({
      blockNumber: blockNumber
    });

    self.logger.log("Saved snapshot #" + self.snapshots.length);

    callback(null, to.hex(self.snapshots.length));
  });
};

StateManager.prototype.revert = function(snapshot_id, callback) {
  var self = this;

  // Convert from hex.
  snapshot_id = utils.bufferToInt(snapshot_id);

  this.logger.log("Reverting to snapshot #" + snapshot_id);

  if (snapshot_id > this.snapshots.length) {
    return false;
  }

  // Convert to zero based.
  snapshot_id = snapshot_id - 1;

  // Loop through each snapshot with a higher id than the current one.
  async.whilst(function() {
    return self.snapshots.length > snapshot_id
  }, function(nextSnapshot) {
    var snapshot = self.snapshots.pop();

    // For each snapshot, asynchronously pop off the blocks it represents.
    async.during(function(doneWithTest) {
      self.blockchain.getHeight(function(err, blockNumber) {
        if (err) return doneWithTest(err);

        doneWithTest(null, blockNumber > snapshot.blockNumber)
      });
    }, function(nextBlock) {
      self.blockchain.popBlock(function(err) {
        if (err) return nextBlock(err);
        nextBlock();
      });
    }, nextSnapshot);


  }, function(err) {
    if (err) return callback(err);

    // Pending transactions are removed when you revert.
    self.blockchain.clearPendingTransactions();

    callback(null, true);
  });
};

StateManager.prototype.hasContractCode = function(address, callback) {
  this.vm.stateManager.getContractCode( address, function( err, result ) {
    if( err != null ) {
      callback( err, false );
    } else {
      callback( null, true );
    }
  });
}

StateManager.prototype.startMining = function(callback) {
  this.is_mining = true;

  if (this.is_mining_on_interval) {
    this.mineOnInterval();
    callback();
  } else {
    this.processBlocks(callback);
  }
};

StateManager.prototype.stopMining = function(callback) {
  this.is_mining = false;
  clearTimeout(this.mining_interval_timeout);
  this.mining_interval_timeout = null;
  callback();
};

StateManager.prototype.isUnlocked = function(address) {
  return this.unlocked_accounts[address.toLowerCase()] != null;
};

module.exports = StateManager;
