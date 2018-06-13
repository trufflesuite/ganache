var BlockchainDouble = require("../blockchain_double.js");
var VM = require("ethereumjs-vm");
var Account = require("ethereumjs-account");
var Block = require("ethereumjs-block");
var Log = require("./log.js");
var Receipt = require("./receipt.js");
var utils = require("ethereumjs-util");
var ForkedStorageTrie = require("./forkedstoragetrie.js");
var Web3 = require("web3");
var to = require("./to.js");
var async = require("async");
var txhelper = require("./txhelper.js")

var inherits = require("util").inherits;

inherits(ForkedBlockchain, BlockchainDouble);

function ForkedBlockchain(options) {
  var self = this;

  this.options = options || {}

  if (options.fork == null) {
    throw new Error("ForkedBlockchain must be passed a fork parameter.");
  }

  this.fork = options.fork;
  this.fork_block_number = options.fork_block_number;
  this.fork_version = null;

  if (typeof this.fork == "string") {
    if (this.fork.indexOf("@") >= 0) {
      var split = this.fork.split("@");
      this.fork = split[0];
      this.fork_block_number = parseInt(split[1]);
    }

    this.fork = new Web3.providers.HttpProvider(this.fork);
  }

  this.time = options.time;
  this.storageTrieCache = {};

  BlockchainDouble.call(this, options);

  this.web3 = new Web3(this.fork);
};

ForkedBlockchain.prototype.initialize = function(accounts, callback) {
  var self = this;

  this.web3.eth.net.getId(function(err, version) {
    if (err) return callback(err);

    self.fork_version = version;

    BlockchainDouble.prototype.initialize.call(self, accounts, function(err) {
      if (err) return callback(err);

      // Unfortunately forking requires a bit of monkey patching, but it gets the job done.
      self.vm.stateManager._lookupStorageTrie = self.lookupStorageTrie.bind(self);
      self.vm.stateManager.cache._lookupAccount = self.getAccount.bind(self);
      self.vm.stateManager.getContractCode = self.getCode.bind(self);
      self.vm.stateManager.putContractCode = self.putCode.bind(self);

      callback();
    });
  });
};

ForkedBlockchain.prototype.createStateTrie = function(db, root) {
  return new ForkedStorageTrie(db, root, {
    fork: this.fork,
    fork_block_number: this.fork_block_number,
    blockchain: this
  });
};

ForkedBlockchain.prototype.createGenesisBlock = function(callback) {
  var self = this;
  var blockNumber = this.fork_block_number || "latest";

  self.web3.eth.getBlock(blockNumber, function(err, json) {
    if (err) return callback(err);

    // If no start time was passed, set the time to where we forked from.
    // We only want to do this if a block was explicitly passed. If a block
    // number wasn't passed, then we're using the last block and the current time.
    if (!self.time && self.fork_block_number) {
      self.time = self.options.time = new Date(to.number(json.timestamp) * 1000);
      self.setTime(self.time);
    }

    blockNumber = to.hex(json.number);

    // Update the relevant block numbers
    self.fork_block_number = self.options.fork_block_number = blockNumber;
    self.stateTrie.fork_block_number = blockNumber;

    self.createBlock(function(err, block) {
      if (err) return callback(err);

      block.header.number = utils.toBuffer(to.number(json.number) + 1);
      block.header.parentHash = utils.toBuffer(json.hash);

      callback(null, block);
    });
  });
};

ForkedBlockchain.prototype.createForkedStorageTrie = function(address) {
  address = to.hex(address);

  var trie = new ForkedStorageTrie(this.data.trie_db, null, {
    address: address,
    stateTrie: this.stateTrie,
    blockchain: this,
    fork: this.fork,
    fork_block_number: this.fork_block_number
  });

  this.storageTrieCache[address] = trie;

  return trie;
};

ForkedBlockchain.prototype.lookupStorageTrie = function(address, callback) {
  var self = this

  address = to.hex(address);

  if (this.storageTrieCache[address] != null) {
    return callback(null, this.storageTrieCache[address]);
  }

  callback(null, this.createForkedStorageTrie(address));
};

ForkedBlockchain.prototype.isFallbackBlock = function(value, callback) {
  var self = this;

  self.getEffectiveBlockNumber(value, function(err, number) {
    if (err) return callback(err);

    callback(null, number <= to.number(self.fork_block_number));
  });
};

ForkedBlockchain.prototype.isBlockHash = function(value) {
  return typeof value == "string" && value.indexOf("0x") == 0 && value.length > 42;
}

ForkedBlockchain.prototype.isFallbackBlockHash = function(value, callback) {
  var self = this;

  if (!this.isBlockHash(value)) {
    return callback(null, false);
  }

  self.data.blockHashes.get(value, function(err, blockIndex) {
    if (err) {
      if (err.notFound) {
        // If the block isn't found in our database, then it must be a fallback block.
        return callback(null, true);
      } else {
        return callback(err);
      }
    }
    callback(null, false);
  });
}

ForkedBlockchain.prototype.getFallbackBlock = function(number_or_hash, cb) {
  var self = this;

  // This function sometimes gets passed hex values that aren't long enough to
  // be a block hash. In that case, let's convert them to a big number so Web3
  // doesn't get stopped up.
  if (typeof number_or_hash == "string" && number_or_hash.length < 66) {
    number_or_hash = self.web3.utils.toBN(number_or_hash)
  }

  self.web3.eth.getBlock(number_or_hash, true, function(err, json) {
    if (err) return cb(err);

    if (json == null) return cb();

    var block = new Block();

    block.header.parentHash = utils.toBuffer(json.parentHash);
    block.header.uncleHash = utils.toBuffer(json.sha3Uncles);
    block.header.coinbase = utils.toBuffer(json.miner);
    block.header.stateRoot = utils.toBuffer(json.stateRoot); // Should we include the following three?
    block.header.transactionTrie = utils.toBuffer(json.transactionsRoot);
    block.header.receiptTrie = utils.toBuffer(json.receiptsRoot);
    block.header.bloom = utils.toBuffer(json.logsBloom);
    block.header.difficulty = utils.toBuffer("0x" + json.totalDifficulty.toString(16)); // BigNumber
    block.header.number = utils.toBuffer(json.number);
    block.header.gasLimit = utils.toBuffer(json.gasLimit);
    block.header.gasUsed = utils.toBuffer(json.gasUsed);
    block.header.timestamp = utils.toBuffer(json.timestamp);
    block.header.extraData = utils.toBuffer(json.extraData);

    (json.transactions || []).forEach(function(tx_json, index) {
      block.transactions.push(txhelper.fromJSON(tx_json));
    });

    // Fake block. Let's do the worst.
    // TODO: Attempt to fill out all block data so as to produce the same hash! (can we?)
    block.hash = function() {
      return utils.toBuffer(json.hash);
    }

    cb(null, block);
  });
}


ForkedBlockchain.prototype.getBlock = function(number, callback) {
  var self = this;

  this.isFallbackBlockHash(number, function(err, isFallbackBlockHash) {
    if (err) return callback(err);
    if (isFallbackBlockHash) {
      return self.getFallbackBlock(number, callback);
    }

    self.isFallbackBlock(number, function(err, isFallbackBlock) {
      if (err) return callback(err);

      if (isFallbackBlock) {
        return self.getFallbackBlock(number, callback);
      }

      // If we don't have string-based a block hash, turn what we do have into a number
      // before sending it to getBlock.
      function getBlockReference(value, callback) {
        if (!self.isBlockHash(value)) {
          self.getRelativeBlockNumber(value, callback);
        } else {
          callback(null, value);
        }
      }

      getBlockReference(number, function(err, blockReference) {
        if (err) return callback(err);

        BlockchainDouble.prototype.getBlock.call(self, blockReference, callback);
      });
    });
  });
};

ForkedBlockchain.prototype.getStorage = function(address, key, number, callback) {
  this.lookupStorageTrie(address, function(err, trie) {
    if (err) return callback(err);
    trie.get(key, callback);
  });
};

ForkedBlockchain.prototype.getCode = function(address, number, callback) {
  var self = this;

  if (typeof number == "function") {
    callback = number;
    number = "latest";
  }

  if (!number) {
    number = "latest";
  }

  this.getEffectiveBlockNumber(number, function(err, effective) {
    number = effective;

    self.stateTrie.keyExists(address, function(err, exists) {
      // If we've stored the value and we're looking at one of our stored blocks,
      // get it from our stored data.
      if (exists && number > to.number(self.fork_block_number)) {
        BlockchainDouble.prototype.getCode.call(self, address, number, callback);
      } else {

        // Else, we need to fetch it from web3. If our number is greater than
        // the fork, let's just use "latest".
        if (number > to.number(self.fork_block_number)) {
          number = "latest";
        }

        self.fetchCodeFromFallback(address, number, function(err, code) {
          if (code) {
            code = utils.toBuffer(code);
          }
          callback(err, code);
        });
      }
    });
  });
};

ForkedBlockchain.prototype.putCode = function(address, value, callback) {
  // This is a bit of a hack. We need to bypass the vm's
  // _lookupAccount call that vm.stateManager.putContractCode() uses.
  // This means we have to do some things ourself. The last call
  // to self.stateTrie.put() at the bottom is important because
  // we can't just be satisfied putting it in the cache.

  var self = this;
  address = utils.toBuffer(address);
  this.stateTrie.get(address, function(err, data) {
    if (err) return callback(err);

    var account = new Account(data);
    account.setCode(self.stateTrie, value, function(err, result) {
      if (err) return callback(err);

      self.stateTrie.put(address, account.serialize(), function(err) {
        if (err) return callback(err);

        // Ensure the cache updates as well.
        self.vm.stateManager.putAccount(address, account, callback);
      });
    });
  })
};

ForkedBlockchain.prototype.getAccount = function(address, number, callback) {
  var self = this;

  if (typeof number == "function") {
    callback = number;
    number = "latest";
  }

  this.getEffectiveBlockNumber(number, function(err, effective) {
    if (err) return callback(err);
    number = effective;

    // If the account doesn't exist in our state trie, get it off the wire.
    self.stateTrie.keyExists(address, function(err, exists) {
      if (err) return callback(err);

      if (exists && number > to.number(self.fork_block_number)) {
        BlockchainDouble.prototype.getAccount.call(self, address, number, function(err, acc) {
          if (err) return callback(err);
          callback(null, acc);
        });
      } else {
        self.fetchAccountFromFallback(address, number, callback);
      }
    });
  });
};

ForkedBlockchain.prototype.getTransaction = function(hash, callback) {
  var self = this;
  BlockchainDouble.prototype.getTransaction.call(this, hash, function(err, tx) {
    if (err) return callback(err);
    if (tx != null) return callback(null, tx);

    self.web3.eth.getTransaction(hash, function(err, result) {
      if (err) return callback(err);

      if (result) {
        result = txhelper.fromJSON(result);
      }

      callback(null, result);
    });
  });
};

ForkedBlockchain.prototype.getTransactionReceipt = function(hash, callback) {
  var self = this;
  BlockchainDouble.prototype.getTransactionReceipt.call(this, hash, function(err, receipt) {
    if (err) return callback(err);
    if (receipt) return callback(null, receipt);

    self.web3.eth.getTransactionReceipt(hash, function(err, receipt_json) {
      if (err) return callback(err);
      if (!receipt_json) return callback();

      async.parallel({
        tx: self.getTransaction.bind(self, hash),
        block: self.getBlock.bind(self, receipt_json.blockNumber)
      }, function(err, result) {
        if (err) return callback(err);

        var logs = receipt_json.logs.map(function(log) {
          return new Log(log);
        });

        var receipt = new Receipt(result.tx, result.block, logs, receipt_json.cumulativeGasUsed,
          receipt_json.contractAddress, receipt_json.status, to.hex(receipt_json.logsBloom));

        callback(null, receipt);
      });
    });
  });
};

ForkedBlockchain.prototype.fetchAccountFromFallback = function(address, block_number, callback) {
  var self = this;
  address = to.hex(address);

  async.parallel({
    code: this.fetchCodeFromFallback.bind(this, address, block_number),
    balance: this.fetchBalanceFromFallback.bind(this, address, block_number),
    nonce: this.fetchNonceFromFallback.bind(this, address, block_number)
  }, function(err, results) {
    if (err) return callback(err);

    var code = results.code;
    var balance = results.balance;
    var nonce = results.nonce;

    var account = new Account({
      nonce: nonce,
      balance: balance
    });

    account.exists = code != "0x0" || balance != "0x0" || nonce != "0x0";

    // This puts the code on the trie, keyed by the hash of the code.
    // It does not actually link an account to code in the trie.
    account.setCode(self.stateTrie, utils.toBuffer(code), function(err) {
      if (err) return callback(err);
      callback(null, account);
    });
  });
};

ForkedBlockchain.prototype.fetchCodeFromFallback = function(address, block_number, callback) {
  var self = this;
  address = to.hex(address);

  // Allow an optional block_number
  if (typeof block_number == "function") {
    callback = block_number;
    block_number = this.fork_block_number;
  }

  this.getSafeFallbackBlockNumber(block_number, function(err, safe_block_number) {
    if (err) return callback(err);

    self.web3.eth.getCode(address, safe_block_number, function(err, code) {
      if (err) return callback(err);

      code = "0x" + utils.toBuffer(code).toString("hex");
      callback(null, code);
    });
  });
}

ForkedBlockchain.prototype.fetchBalanceFromFallback = function(address, block_number, callback) {
  var self = this;
  address = to.hex(address);

  // Allow an optional block_number
  if (typeof block_number == "function") {
    callback = block_number;
    block_number = this.fork_block_number;
  }

  this.getSafeFallbackBlockNumber(block_number, function(err, safe_block_number) {
    if (err) return callback(err);

    self.web3.eth.getBalance(address, safe_block_number, function(err, balance) {
      if (err) return callback(err);

      balance = "0x" + balance.toString(16); // BigNumber
      callback(null, balance);
    });
  });
}

ForkedBlockchain.prototype.fetchNonceFromFallback = function(address, block_number, callback) {
  var self = this;
  address = to.hex(address);

  // Allow an optional block_number
  if (typeof block_number == "function") {
    callback = block_number;
    block_number = this.fork_block_number;
  }

  this.getSafeFallbackBlockNumber(block_number, function(err, safe_block_number) {
    if (err) return callback(err);

    self.web3.eth.getTransactionCount(address, safe_block_number, function(err, nonce) {
      if (err) return callback(err);

      nonce = "0x" + self.web3.utils.toBN(nonce).toString(16);
      callback(null, nonce);
    });
  });
}

ForkedBlockchain.prototype.getHeight = function(callback) {
  var self = this;
  this.latestBlock(function(err, block) {
    if (err) return callback(err);
    callback(null, to.number(block.header.number));
  });
};

ForkedBlockchain.prototype.getRelativeBlockNumber = function(number, callback) {
  var self = this;
  this.getEffectiveBlockNumber(number, function(err, effective) {
    if (err) return callback(err);
    callback(null, effective - to.number(self.fork_block_number) - 1)
  });
};

ForkedBlockchain.prototype.getSafeFallbackBlockNumber = function(block_number, callback) {
  var fork_block_number = to.number(this.fork_block_number);

  if (block_number == null) {
    return callback(null, fork_block_number);
  };

  this.getEffectiveBlockNumber(block_number, function(err, effective) {
    if (effective > fork_block_number) {
      effective = fork_block_number
    }

    callback(null, effective);
  });
};

ForkedBlockchain.prototype.getBlockLogs = function(number, callback) {
  var self = this;

  this.getEffectiveBlockNumber(number, function(err, effective) {
    if (err) return callback(err);

    self.getRelativeBlockNumber(effective, function(err, relative) {
      if (err) return callback(err);

      if (relative < 0) {
        self.getBlock(number, function(err, block) {
          if (err) return callback(err);

          self.web3.currentProvider.send({
            jsonrpc: "2.0",
            method: "eth_getLogs",
            params: [{
              fromBlock: to.hex(number),
              toBlock: to.hex(number)
            }],
            id: new Date().getTime()
          }, function(err, res) {
            if (err) return callback(err);

            var logs = res.result.map(function(log) {
              // To make this result masquerade as the right information.
              log.block = block;
              return new Log(log);
            });

            callback(null, logs);
          });
        });
      } else {
        BlockchainDouble.prototype.getBlockLogs.call(self, relative, callback);
      }
    });
  });
};

ForkedBlockchain.prototype._checkpointTrie = function() {
  var self = this;

  BlockchainDouble.prototype._checkpointTrie.call(this);

  Object.keys(this.storageTrieCache).forEach(function(address) {
    var trie = self.storageTrieCache[address];
    trie.customCheckpoint();
  });
};

ForkedBlockchain.prototype._revertTrie = function() {
  var self = this;

  BlockchainDouble.prototype._revertTrie.call(this);

  Object.keys(this.storageTrieCache).forEach(function(address) {
    var trie = self.storageTrieCache[address];

    // We're trying to revert to a point before this trie was created.
    // Let's just remove the trie.
    if (trie.checkpoints.length == 0) {
      delete self.storageTrieCache[address];
    } else {
      trie.customRevert();
    }
  });
};

module.exports = ForkedBlockchain;
