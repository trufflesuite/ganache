var BlockchainDouble = require("../blockchain_double.js");
var Account = require("ethereumjs-account");
var Block = require("ethereumjs-block");
var Log = require("./log.js");
var Receipt = require("./receipt.js");
var utils = require("ethereumjs-util");
var ForkedStorageTrie = require("./forkedstoragetrie.js");
var Web3 = require("web3");
var to = require("./to.js");
var Transaction = require("./transaction");
var async = require("async");
var BN = require("bn.js");

var inherits = require("util").inherits;

inherits(ForkedBlockchain, BlockchainDouble);

function ForkedBlockchain(options) {
  this.options = options || {};

  if (options.fork == null) {
    throw new Error("ForkedBlockchain must be passed a fork parameter.");
  }

  this.fork = options.fork;
  this.forkBlockNumber = options.forkBlockNumber;
  this.forkVersion = null;

  if (typeof this.fork === "string") {
    if (this.fork.indexOf("@") >= 0) {
      var split = this.fork.split("@");
      this.fork = split[0];
      this.forkBlockNumber = parseInt(split[1]);
    }

    this.fork = new Web3.providers.HttpProvider(this.fork);
  }

  this.time = options.time;
  this.storageTrieCache = {};

  BlockchainDouble.call(this, options);

  this.createVMFromStateTrie = function() {
    var vm = BlockchainDouble.prototype.createVMFromStateTrie.apply(this, arguments);
    this.patchVM(vm);
    return vm;
  };

  this.web3 = new Web3(this.fork);
}

ForkedBlockchain.prototype.initialize = function(accounts, callback) {
  var self = this;

  this.web3.eth.net.getId(function(err, version) {
    if (err) {
      return callback(err);
    }

    self.forkVersion = version;

    BlockchainDouble.prototype.initialize.call(self, accounts, function(err) {
      if (err) {
        return callback(err);
      }

      self.patchVM(self.vm);

      callback();
    });
  });
};
ForkedBlockchain.prototype.patchVM = function(vm) {
  // Unfortunately forking requires a bit of monkey patching, but it gets the job done.
  vm.stateManager._lookupStorageTrie = this.lookupStorageTrie.bind(this);
  vm.stateManager._cache._lookupAccount = this.getAccount.bind(this);
  vm.stateManager.getContractCode = this.getCode.bind(this);
};

ForkedBlockchain.prototype.createStateTrie = function(db, root) {
  return new ForkedStorageTrie(db, root, {
    fork: this.fork,
    forkBlockNumber: this.forkBlockNumber,
    blockchain: this
  });
};

ForkedBlockchain.prototype.createGenesisBlock = function(callback) {
  var self = this;
  var blockNumber = this.forkBlockNumber || "latest";

  self.web3.eth.getBlock(blockNumber, function(err, json) {
    if (err) {
      return callback(err);
    }

    // If no start time was passed, set the time to where we forked from.
    // We only want to do this if a block was explicitly passed. If a block
    // number wasn't passed, then we're using the last block and the current time.
    if (!self.time && self.forkBlockNumber) {
      self.time = self.options.time = new Date(to.number(json.timestamp) * 1000);
      self.setTime(self.time);
    }

    blockNumber = to.hex(json.number);

    // Update the relevant block numbers
    self.forkBlockNumber = self.options.forkBlockNumber = blockNumber;
    self.stateTrie.forkBlockNumber = blockNumber;

    self.createBlock(function(err, block) {
      if (err) {
        return callback(err);
      }

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
    forkBlockNumber: this.forkBlockNumber
  });

  this.storageTrieCache[address] = trie;

  return trie;
};

ForkedBlockchain.prototype.lookupStorageTrie = function(address, callback) {
  address = to.hex(address);

  if (this.storageTrieCache[address] != null) {
    return callback(null, this.storageTrieCache[address]);
  }

  callback(null, this.createForkedStorageTrie(address));
};

ForkedBlockchain.prototype.isFallbackBlock = function(value, callback) {
  var self = this;

  self.getEffectiveBlockNumber(value, function(err, number) {
    if (err) {
      return callback(err);
    }

    callback(null, number <= to.number(self.forkBlockNumber));
  });
};

ForkedBlockchain.prototype.isBlockHash = function(value) {
  return typeof value === "string" && value.indexOf("0x") === 0 && value.length > 42;
};

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
};

ForkedBlockchain.prototype.getFallbackBlock = function(numberOrHash, cb) {
  var self = this;

  // This function sometimes gets passed hex values that aren't long enough to
  // be a block hash. In that case, let's convert them to a big number so Web3
  // doesn't get stopped up.
  if (typeof numberOrHash === "string" && numberOrHash.length < 66) {
    numberOrHash = self.web3.utils.toBN(numberOrHash);
  }

  self.web3.eth.getBlock(numberOrHash, true, function(err, json) {
    if (err) {
      return cb(err);
    }

    if (json == null) {
      return cb();
    }

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

    (json.transactions || []).forEach(function(txJson, index) {
      block.transactions.push(Transaction.fromJSON(txJson, Transaction.types.real));
    });

    // Fake block. Let's do the worst.
    // TODO: Attempt to fill out all block data so as to produce the same hash! (can we?)
    block.hash = function() {
      return utils.toBuffer(json.hash);
    };

    cb(null, block);
  });
};

ForkedBlockchain.prototype.getBlock = function(number, callback) {
  var self = this;

  this.isFallbackBlockHash(number, function(err, isFallbackBlockHash) {
    if (err) {
      return callback(err);
    }
    if (isFallbackBlockHash) {
      return self.getFallbackBlock(number, callback);
    }

    self.isFallbackBlock(number, function(err, isFallbackBlock) {
      if (err) {
        return callback(err);
      }

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
        if (err) {
          return callback(err);
        }

        BlockchainDouble.prototype.getBlock.call(self, blockReference, callback);
      });
    });
  });
};

ForkedBlockchain.prototype.getStorage = function(address, key, number, callback) {
  this.lookupStorageTrie(address, function(err, trie) {
    if (err) {
      return callback(err);
    }
    trie.get(key, callback);
  });
};

ForkedBlockchain.prototype.getCode = function(address, number, callback) {
  var self = this;

  if (typeof number === "function") {
    callback = number;
    number = "latest";
  }

  if (!number) {
    number = "latest";
  }

  this.getEffectiveBlockNumber(number, function(err, effective) {
    if (err) {
      return callback(err);
    }
    number = effective;

    self.stateTrie.keyExists(address, function(err, exists) {
      if (err) {
        return callback(err);
      }
      // If we've stored the value and we're looking at one of our stored blocks,
      // get it from our stored data.
      if (exists && number > to.number(self.forkBlockNumber)) {
        BlockchainDouble.prototype.getCode.call(self, address, number, callback);
      } else {
        // Else, we need to fetch it from web3. If our number is greater than
        // the fork, let's just use "latest".
        if (number > to.number(self.forkBlockNumber)) {
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

ForkedBlockchain.prototype.getAccount = function(address, number, callback) {
  var self = this;

  if (typeof number === "function") {
    callback = number;
    number = "latest";
  }

  this.getEffectiveBlockNumber(number, function(err, effective) {
    if (err) {
      return callback(err);
    }
    number = effective;

    // If the account doesn't exist in our state trie, get it off the wire.
    self.stateTrie.keyExists(address, function(err, exists) {
      if (err) {
        return callback(err);
      }

      if (exists && number > to.number(self.forkBlockNumber)) {
        BlockchainDouble.prototype.getAccount.call(self, address, number, function(err, acc) {
          if (err) {
            return callback(err);
          }
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
    if (err) {
      return callback(err);
    }
    if (tx != null) {
      return callback(null, tx);
    }

    self.web3.eth.getTransaction(hash, function(err, result) {
      if (err) {
        return callback(err);
      }

      if (result) {
        result = Transaction.fromJSON(result, Transaction.types.signed);
      }

      callback(null, result);
    });
  });
};

ForkedBlockchain.prototype.getTransactionReceipt = function(hash, callback) {
  var self = this;
  BlockchainDouble.prototype.getTransactionReceipt.call(this, hash, function(err, receipt) {
    if (err) {
      return callback(err);
    }
    if (receipt) {
      return callback(null, receipt);
    }

    self.web3.eth.getTransactionReceipt(hash, function(err, receiptJson) {
      if (err) {
        return callback(err);
      }
      if (!receiptJson) {
        return callback();
      }

      async.parallel(
        {
          tx: self.getTransaction.bind(self, hash),
          block: self.getBlock.bind(self, receiptJson.blockNumber)
        },
        function(err, result) {
          if (err) {
            return callback(err);
          }

          var logs = receiptJson.logs.map(function(log) {
            return new Log(log);
          });

          var receipt = new Receipt(
            result.tx,
            result.block,
            logs,
            receiptJson.gasUsed,
            receiptJson.cumulativeGasUsed,
            receiptJson.contractAddress,
            receiptJson.status,
            to.hex(receiptJson.logsBloom)
          );

          callback(null, receipt);
        }
      );
    });
  });
};

ForkedBlockchain.prototype.fetchAccountFromFallback = function(address, blockNumber, callback) {
  var self = this;
  address = to.hex(address);

  async.parallel(
    {
      code: this.fetchCodeFromFallback.bind(this, address, blockNumber),
      balance: this.fetchBalanceFromFallback.bind(this, address, blockNumber),
      nonce: this.fetchNonceFromFallback.bind(this, address, blockNumber)
    },
    function(err, results) {
      if (err) {
        return callback(err);
      }

      var code = results.code;
      var balance = results.balance;
      var nonce = results.nonce;

      var account = new Account({
        nonce: nonce,
        balance: balance
      });

      // This puts the code on the trie, keyed by the hash of the code.
      // It does not actually link an account to code in the trie.
      account.setCode(self.stateTrie, utils.toBuffer(code), function(err) {
        if (err) {
          return callback(err);
        }
        callback(null, account);
      });
    }
  );
};

ForkedBlockchain.prototype.fetchCodeFromFallback = function(address, blockNumber, callback) {
  var self = this;
  address = to.hex(address);

  // Allow an optional blockNumber
  if (typeof blockNumber === "function") {
    callback = blockNumber;
    blockNumber = this.forkBlockNumber;
  }

  this.getSafeFallbackBlockNumber(blockNumber, function(err, safeBlockNumber) {
    if (err) {
      return callback(err);
    }

    self.web3.eth.getCode(address, safeBlockNumber, function(err, code) {
      if (err) {
        return callback(err);
      }

      code = "0x" + utils.toBuffer(code).toString("hex");
      callback(null, code);
    });
  });
};

ForkedBlockchain.prototype.fetchBalanceFromFallback = function(address, blockNumber, callback) {
  var self = this;
  address = to.hex(address);

  // Allow an optional blockNumber
  if (typeof blockNumber === "function") {
    callback = blockNumber;
    blockNumber = this.forkBlockNumber;
  }

  this.getSafeFallbackBlockNumber(blockNumber, function(err, safeBlockNumber) {
    if (err) {
      return callback(err);
    }

    self.web3.eth.getBalance(address, safeBlockNumber, function(err, balance) {
      if (err) {
        return callback(err);
      }

      balance = "0x" + new BN(balance).toString(16);
      callback(null, balance);
    });
  });
};

ForkedBlockchain.prototype.fetchNonceFromFallback = function(address, blockNumber, callback) {
  var self = this;
  address = to.hex(address);

  // Allow an optional blockNumber
  if (typeof blockNumber === "function") {
    callback = blockNumber;
    blockNumber = this.forkBlockNumber;
  }

  this.getSafeFallbackBlockNumber(blockNumber, function(err, safeBlockNumber) {
    if (err) {
      return callback(err);
    }

    self.web3.eth.getTransactionCount(address, safeBlockNumber, function(err, nonce) {
      if (err) {
        return callback(err);
      }

      nonce = "0x" + self.web3.utils.toBN(nonce).toString(16);
      callback(null, nonce);
    });
  });
};

ForkedBlockchain.prototype.getHeight = function(callback) {
  this.latestBlock(function(err, block) {
    if (err) {
      return callback(err);
    }
    callback(null, to.number(block.header.number));
  });
};

ForkedBlockchain.prototype.getRelativeBlockNumber = function(number, callback) {
  var self = this;
  this.getEffectiveBlockNumber(number, function(err, effective) {
    if (err) {
      return callback(err);
    }
    callback(null, effective - to.number(self.forkBlockNumber) - 1);
  });
};

ForkedBlockchain.prototype.getSafeFallbackBlockNumber = function(blockNumber, callback) {
  var forkBlockNumber = to.number(this.forkBlockNumber);

  if (blockNumber == null) {
    return callback(null, forkBlockNumber);
  }

  this.getEffectiveBlockNumber(blockNumber, function(err, effective) {
    if (err) {
      return callback(err);
    }
    if (effective > forkBlockNumber) {
      effective = forkBlockNumber;
    }

    callback(null, effective);
  });
};

ForkedBlockchain.prototype.getBlockLogs = function(number, callback) {
  var self = this;

  this.getEffectiveBlockNumber(number, function(err, effective) {
    if (err) {
      return callback(err);
    }

    self.getRelativeBlockNumber(effective, function(err, relative) {
      if (err) {
        return callback(err);
      }

      if (relative < 0) {
        self.getBlock(number, function(err, block) {
          if (err) {
            return callback(err);
          }

          self.web3.currentProvider.send(
            {
              jsonrpc: "2.0",
              method: "eth_getLogs",
              params: [
                {
                  fromBlock: to.hex(number),
                  toBlock: to.hex(number)
                }
              ],
              id: new Date().getTime()
            },
            function(err, res) {
              if (err) {
                return callback(err);
              }

              var logs = res.result.map(function(log) {
                // To make this result masquerade as the right information.
                log.block = block;
                return new Log(log);
              });

              callback(null, logs);
            }
          );
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
    if (trie.checkpoints.length === 0) {
      delete self.storageTrieCache[address];
    } else {
      trie.customRevert();
    }
  });
};

module.exports = ForkedBlockchain;
