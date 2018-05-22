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
var util = require("util");
var _ = require("lodash");

var to = require('./utils/to');
var random = require('./utils/random');
var txhelper = require('./utils/txhelper');
var TXRejectedError = require('./utils/txrejectederror');

StateManager = function(options, provider) {
  var self = this;

  this.options = options = this._applyDefaultOptions(options || {})

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
  this.total_accounts = options.total_accounts;
  this.coinbase = null;

  this.latest_filter_id = 1;

  // This queue manages actions that shouldn't be run in parallel.
  // The action_processing flag ensures new actions are queued instead of
  // run immediately.
  this.action_queue = [];
  this.action_processing == false;

  this.snapshots = [];
  this.logger = options.logger;
  this.net_version = options.network_id;
  this.mnemonic = options.mnemonic;
  this.wallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(this.mnemonic));
  this.wallet_hdpath = options.hdPath;

  this.gasPriceVal = to.hex(options.gasPrice);

  this.is_mining = true;
  this.blockTime = options.blockTime;
  this.is_mining_on_interval = !!options.blockTime;
  this.mining_interval_timeout = null;

  this._provider = provider;
}

const defaultOptions =  {
  total_accounts: 10,
  gasPrice: '0x4A817C800',
  default_balance_ether: 100,
  unlocked_accounts: [],
  hdPath: "m/44'/60'/0'/0/"
}

StateManager.prototype._applyDefaultOptions = function(options) {
  // do this so that we can use the same seed on our next run and get the same
  // results without explicitly setting a seed up front
  if (!options.seed) {
    options.seed = random.randomAlphaNumericString(10, seedrandom())
  }

  // generate a randomized default mnemonic
  if (!options.mnemonic) {
    let randomBytes = random.randomBytes(16, seedrandom(options.seed))
    options.mnemonic = bip39.entropyToMnemonic(randomBytes.toString("hex"))
  }

  if (!options.fork && !options.network_id) {
    options.network_id = (new Date()).getTime();
  }

  // We want this function to mutate the options object so that we can report
  // our settings back to our consumer application (e.g., ganache)
  return _.merge(options, defaultOptions, Object.assign({}, options));
}

StateManager.prototype.initialize = function(callback) {
  var self = this;

  var accounts = [];

  let defaultBalanceWei = to.hex(Web3.utils.toWei(self.options.default_balance_ether.toString(), 'ether'));

  if (self.options.accounts) {
    accounts = self.options.accounts.map(self.createAccount.bind(self));
  } else {
    if (!self.total_accounts) {
      return callback(new Error('Cannot initialize chain: either options.accounts or options.total_accounts must be specified'))
    }

    for (var i = 0; i < self.total_accounts; i++) {
      accounts.push(self.createAccount({
        index: i,
        balance: defaultBalanceWei
      }));
    }
  }

  self.coinbase = to.hex(accounts[0].address);
  self.accounts = {};

  accounts.forEach(function(data) {
    self.accounts[data.address] = data;
    self.personal_accounts[data.address.toLowerCase()] = true;
  });

  // Turn array into object, mostly for speed purposes.
  // No need for caller to specify private keys.
  self.unlocked_accounts = self.options.unlocked_accounts.reduce(function(obj, address) {
    // If it doesn't have a hex prefix, must be a number (either a string or number type).
    if ((address + "").indexOf("0x") != 0) {
      let idx = parseInt(address)
      let account = accounts[idx]
      if (!account) {
        throw new Error(`Account at index ${idx} not found. Max index available is ${accounts.length - 1}.`)
      }
      address = account.address.toLowerCase();
    }

    obj[address.toLowerCase()] = true; // can be any value
    return obj;
  }, {});

  if (!self.secure) {
    accounts.forEach(function(data) {
      self.unlocked_accounts[data.address.toLowerCase()] = data;
    });
  }

  self.blockchain.initialize(accounts, function(err) {
    if (err) return callback(err);

    // If the user didn't pass a specific version id in, then use the
    // forked blockchain's version (if it exists) or create our own.
    if (!self.net_version) {
      self.net_version = self.blockchain.fork_version
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
    self._provider.send({
      method: 'evm_mine'
    },
      self.mineOnInterval.bind(self)
    );

  }, this.blockTime * 1000);

  // Ensure this won't keep a node process open.
  if (this.mining_interval_timeout && this.mining_interval_timeout.unref) {
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

  account.balance = to.hex(opts.balance)

  var data = {
    secretKey: secretKey,
    publicKey: publicKey,
    address: to.hex(address).toLowerCase(),
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
      balance = to.rpcQuantityHexString(balance);
    }
    callback(err, balance);
  });
}

StateManager.prototype.getTransactionCount = function(address, number, callback) {
  this.blockchain.getNonce(address, number, function(err, nonce) {
    if (nonce) {
      nonce = to.rpcQuantityHexString(nonce);
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
  var data = Buffer.from(utils.stripHexPrefix(rawTx), 'hex');

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

  if (tx.v && tx.v.length > 0 &&
      tx.r && tx.r.length > 0 &&
      tx.s && tx.s.length > 0) {
    txParams.v = tx.v.toString('hex');
    txParams.r = tx.r.toString('hex');
    txParams.s = tx.s.toString('hex');
  }

  this.queueTransaction("eth_sendRawTransaction", txParams, null, callback);
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

StateManager.prototype.queueTransaction = function(method, tx_params, block_number, callback) {
  if (tx_params.from == null) {
    callback(new TXRejectedError("from not found; is required"));
    return;
  }

  // use toLowerCase() to properly handle from addresses meant to be validated.
  tx_params.from = utils.addHexPrefix(tx_params.from).toLowerCase();

  if (method == "eth_sendTransaction" &&
    this.accounts[tx_params.from] == null &&
    this.unlocked_accounts[tx_params.from] == null) {

    return callback(new TXRejectedError("sender account not recognized"));
  }

  if (method == "eth_sendTransaction" && this.unlocked_accounts[tx_params.from] == null) {
    return callback(new TXRejectedError("signer account is locked"));
  }

  var rawTx = {
    gasPrice: "0x1",
    gasLimit: to.hex(this.blockchain.defaultTransactionGasLimit),
    value: '0x0',
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

  if (tx_params.v != null && tx_params.s != null && tx_params.v != null) {
    rawTx.v = utils.addHexPrefix(tx_params.v);
    rawTx.r = utils.addHexPrefix(tx_params.r);
    rawTx.s = utils.addHexPrefix(tx_params.s);
  }

  // some tools use a null or empty `to` field when doing contract deployments
  if (rawTx.to == '0x0' || rawTx.to == '') {
    delete rawTx.to
  }

  // Error checks
  if (rawTx.to && typeof rawTx.to != "string") {
    return callback(new TXRejectedError("Invalid to address"));
  }

  // If the transaction has a higher gas limit than the block gas limit, error.
  if (to.number(rawTx.gasLimit) > to.number(this.blockchain.blockGasLimit)) {
    return callback(new TXRejectedError("Exceeds block gas limit"));
  }

  // Get the nonce for this address, taking account any transactions already queued.
  var self = this;
  var address = utils.toBuffer(tx_params.from);

  // we don't call createFakeTransactionWithCorrectNonce here because then we'd need to worry
  // about nonce calculation for the items pending in the action_queue.
  // Instead, we simply create a `FakeTransaction` and bail on validation
  // errors so that we fail fast when we have bad tx input

  try {
    let tx = new FakeTransaction(rawTx);
    tx.from = address;
  } catch (err) {
    return callback(err);
  }

  self.action_queue.push({
    method: method,
    from: tx_params.from,
    tx: rawTx,
    callback: callback,
    blockNumber: block_number,
  });

  // We know there's work, so get started.
  self.processNextAction();
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
    this.processCall(queued.from, queued.tx, queued.blockNumber, intermediary);
  } else if (queued.method == "eth_estimateGas") {
    this.processGasEstimate(queued.from, queued.tx, queued.blockNumber, intermediary);
  }
};

StateManager.prototype.sign = function(address, dataToSign) {
  var account = this.accounts[to.hex(address).toLowerCase()];

  if (!account) {
    throw new Error("cannot sign data; no private key");
  }

  var secretKey = account.secretKey;
  var msg = Buffer.from(dataToSign.replace('0x',''), 'hex');
  var msgHash = utils.hashPersonalMessage(msg);
  var sgn = utils.ecsign(msgHash, Buffer.from(secretKey));
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

StateManager.prototype.processCall = function (from, rawTx, blockNumber, callback) {
  var self = this;

  self.createFakeTransactionWithCorrectNonce(rawTx, from, function(err, tx) {
    if (err) return callback(err);

    self.blockchain.processCall(tx, blockNumber, function (err, results) {
      if (err) {
        return callback(err);
      }

      var result = '0x0'
      if (!results.error && results.vm.return) {
        result = to.hex(results.vm.return);
      } else if (results.error) {
        self.logger.log(`Error processing call: ${results.error}`)
      }

      return callback(null, result);
    });
  });
};

StateManager.prototype.processGasEstimate = function (from, rawTx, blockNumber, callback) {
  var self = this;

  self.createFakeTransactionWithCorrectNonce(rawTx, from, function(err, tx) {
    if (err) return callback(err);

    self.blockchain.processCall(tx, blockNumber, function (err, results) {
      if (err) {
        return callback(err);
      }
      var result = '0x0'
      if (!results.error) {
        result = to.hex(results.gasUsed)
      } else {
        self.logger.log(`Error calculating gas estimate: ${results.error}`)
      }
      return callback(null, result);
    });
  });
}

StateManager.prototype.processTransaction = function(from, rawTx, callback) {
  var self = this;

  self.createFakeTransactionWithCorrectNonce(rawTx, from, function(err, tx) {
    if (err) return callback(err);

    self.blockchain.queueTransaction(tx);

    var tx_hash = to.hex(tx.hash());

    // If we're not currently mining or we're mining on an interval,
    // only queue the transaction, don't process it.
    if (self.is_mining == false || self.is_mining_on_interval) {
      return callback(null, tx_hash);
    }

    self.processBlocks(function (err) {
      if (err) return callback(err);
      callback(null, tx_hash);
    });
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
      blockNumber: blockNumber,
      timeAdjustment: self.blockchain.timeAdjustment
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
  var timeAdjustment = this.snapshots[snapshot_id].timeAdjustment;

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
    // The time adjustment is restored to its prior state
    self.blockchain.timeAdjustment = timeAdjustment;

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

StateManager.prototype.createFakeTransactionWithCorrectNonce = function(rawTx, from, callback) {
  const self = this;
  self.blockchain.getQueuedNonce(from, (err, expectedNonce) => {
    if (err) return callback(err);

    var tx = new FakeTransaction(rawTx);
    tx.from = from;

    // If the user specified a nonce, use that instead.
    if (rawTx.nonce == null) {
      // account for transactions waiting in the tx queue
      tx.nonce = to.hex(expectedNonce);
    } else {
      if (to.number(rawTx.nonce) !== to.number(expectedNonce)) {
        return callback(new TXRejectedError(`the tx doesn't have the correct nonce. ` +
        `account has nonce of: ${to.number(expectedNonce)} ` +
        `tx has nonce of: ${to.number(tx.nonce)}`))
      }
    }

    // If we're calling a contract, check to make sure the address specified is a contract address
    if (_transactionIsContractCall(rawTx)) {
      self.getCode(to.hex(rawTx.to), 'latest', function(err, code) {
        if (err) {
          callback(err);
        } else if (code === '0x0') {
          callback(new TXRejectedError(`Attempting to run transaction which calls a contract function, but recipient address ${to.hex(rawTx.to)} is not a contract address`))
        } else {
          callback(null, tx)
        }
      });
    } else {
      callback(null, tx)
    }
  });
}

// returns true when transaction has a non-null, non-empty to and data field
var _transactionIsContractCall = function(rawTx) {
  let recipient = to.hex(rawTx.to || '0x0')
  let data = to.hex(rawTx.data || '0x0')

  return recipient !== '0x0' && data !== '0x0'
}
module.exports = StateManager;
