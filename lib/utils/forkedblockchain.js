var BlockchainDouble = require("../blockchain_double.js");
var Account = require("ethereumjs-account");
var Block = require("ethereumjs-block");
var Log = require("./log.js");
var Receipt = require("./receipt.js");
var utils = require("ethereumjs-util");
var ForkedStorageTrie = require("./forkedstoragetrie.js");
var Web3 = require("web3");
var to = require("./to.js");
var async = require("async");
var txhelper = require("./txhelper.js");
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

      callback();
    });
  });
};

ForkedBlockchain.prototype.getVM = function getVM(root) {
  let vm = BlockchainDouble.prototype.getVM.call(this, root);

  // Unfortunately forking requires a bit of monkey patching, but it gets the job done.
  vm.stateManager._lookupStorageTrie = this.lookupStorageTrie.bind(this, vm.stateManager.trie);
  vm.stateManager.cache._lookupAccount = this._getAccount.bind(this, vm.stateManager.trie);
  vm.stateManager.getContractCode = this._getCode.bind(this, vm.stateManager.trie);
  vm.stateManager.putContractCode = this._putCode.bind(this, vm);

  return vm;
};

ForkedBlockchain.prototype.getStateTrie = function(root) {
  return new ForkedStorageTrie(this.database.trie_db, root, {
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

ForkedBlockchain.prototype.createForkedStorageTrie = function(stateTrie, address) {
  address = to.hex(address);

  var trie = new ForkedStorageTrie(this.database.trie_db, null, {
    address: address,
    stateTrie,
    blockchain: this,
    fork: this.fork,
    forkBlockNumber: this.forkBlockNumber
  });

  this.storageTrieCache[address] = trie;

  return trie;
};

ForkedBlockchain.prototype.lookupStorageTrie = function(stateTrie, address, callback) {
  address = to.hex(address);

  if (this.storageTrieCache[address] != null) {
    return callback(null, this.storageTrieCache[address]);
  }

  callback(null, this.createForkedStorageTrie(stateTrie, address));
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
  return (typeof value === "string" && value.indexOf("0x") === 0 && value.length > 42) ||
    (Buffer.isBuffer(value) && value.length >= 32);
};

ForkedBlockchain.prototype.isFallbackBlockHash = function(value, callback) {
  var self = this;

  if (!this.isBlockHash(value)) {
    return callback(null, false);
  }

  self.database.blockHashes.get(value, function(err, blockIndex) {
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
      block.transactions.push(txhelper.fromJSON(txJson));
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
  const self = this;

  if (self.isBlockHash(number)) {
    self.isFallbackBlockHash(number, function(err, isFallbackBlockHash) {
      if (err) {
        return callback(err);
      }
      if (isFallbackBlockHash) {
        return self.getFallbackBlock(number, callback);
      } else {
        return BlockchainDouble.prototype.getBlock.call(self, number, callback);
      }
    });
  } else {
    self.isFallbackBlock(number, function(err, isFallbackBlock) {
      if (err) {
        return callback(err);
      }

      if (isFallbackBlock) {
        return self.getFallbackBlock(number, callback);
      } else {
        // If we don't have string-based a block hash, turn what we do have into a number
        // before sending it to getBlock.
        self.getRelativeBlockNumber(number, function(err, blockReference) {
          if (err) {
            return callback(err);
          }

          BlockchainDouble.prototype.getBlock.call(self, blockReference, callback);
        });
      }
    });
  }
};

ForkedBlockchain.prototype.getStorage = function(address, key, number, callback) {
  // TODO - get by block
  let stateTrie = this.getStateTrie(this.getLatestStateRoot());
  this.lookupStorageTrie(stateTrie, address, function(err, trie) {
    if (err) {
      return callback(err);
    }
    trie.get(key, callback);
  });
};

ForkedBlockchain.prototype.getCode = function(address, number, callback) {
  let stateTrie = this.getStateTrie(this.getLatestStateRoot());
  this._getCode(stateTrie, address, number, callback);
};

ForkedBlockchain.prototype._getCode = function(stateTrie, address, number, callback) {
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

    stateTrie.keyExists(address, function(err, exists) {
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

ForkedBlockchain.prototype._putCode = function(vm, address, value, callback) {
  // This is a bit of a hack. We need to bypass the vm's
  // _lookupAccount call that vm.stateManager.putContractCode() uses.
  // This means we have to do some things ourself. The last call
  // to self.stateTrie.put() at the bottom is important because
  // we can't just be satisfied putting it in the cache.

  vm.stateManager.cache.flush(() => {
    address = utils.toBuffer(address);
    vm.stateManager.trie.get(address, function(err, data) {
      if (err) {
        return callback(err);
      }

      var account = new Account(data);
      account.setCode(vm.stateManager.trie, value, function(err, result) {
        if (err) {
          return callback(err);
        }

        vm.stateManager.trie.put(address, account.serialize(), function(err) {
          if (err) {
            return callback(err);
          }

          // Ensure the cache updates as well.
          vm.stateManager.putAccount(address, account, callback);
        });
      });
    });
  });
};

ForkedBlockchain.prototype.getAccount = function(address, number, callback) {
  let stateTrie = this.getStateTrie(this.getLatestStateRoot());
  this._getAccount(stateTrie, address, number, callback);
};

ForkedBlockchain.prototype._getAccount = function(stateTrie, address, number, callback) {
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
    stateTrie.keyExists(address, function(err, exists) {
      if (err) {
        return callback(err);
      }

      if (exists && number > to.number(self.forkBlockNumber)) {
        BlockchainDouble.prototype.getAccount.call(self, stateTrie, address, number, function(err, acc) {
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
        result = txhelper.fromJSON(result);
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

      account.exists = code !== "0x" || balance !== "0x0" || nonce !== "0x0";

      let stateTrie = self.getStateTrie(self.getLatestStateRoot());

      // This puts the code on the trie, keyed by the hash of the code.
      // It does not actually link an account to code in the trie.
      account.setCode(stateTrie, utils.toBuffer(code), function(err) {
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
