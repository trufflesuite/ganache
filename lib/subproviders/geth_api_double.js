var utils = require("ethereumjs-util");
var inherits = require("util").inherits;
var StateManager = require("../statemanager.js");
var to = require("../utils/to");
var txhelper = require("../utils/txhelper");
var blockHelper = require("../utils/block_helper");
var pkg = require("../../package.json");

var Subprovider = require("web3-provider-engine/subproviders/subprovider.js");

inherits(GethApiDouble, Subprovider);

function GethApiDouble(options, provider) {
  var self = this;

  this.state = options.state || new StateManager(options, provider);
  this.options = options;
  this.initialized = false;

  this.initialization_error = null;
  this.post_initialization_callbacks = [];

  this.state.initialize(function(err) {
    if (err) {
      self.initialization_error = err;
    }
    self.initialized = true;

    var callbacks = self.post_initialization_callbacks;
    self.post_initialization_callbacks = [];

    callbacks.forEach(function(callback) {
      setImmediate(function() {
        callback(self.initialization_error, self.state);
      });
    });
  });
}

GethApiDouble.prototype.waitForInitialization = function(callback) {
  var self = this;
  if (self.initialized === false) {
    self.post_initialization_callbacks.push(callback);
  } else {
    callback(self.initialization_error, self.state);
  }
};

// Function to not pass methods through until initialization is finished
GethApiDouble.prototype.handleRequest = function(payload, next, end) {
  var self = this;

  if (self.initialization_error != null) {
    return end(self.initialization_error);
  }

  if (self.initialized === false) {
    self.waitForInitialization(self.getDelayedHandler(payload, next, end));
    return;
  }

  var method = self[payload.method];

  if (method == null) {
    return end(new Error("Method " + payload.method + " not supported."));
  }

  var params = payload.params || [];
  var args = [].concat(params);

  var addedBlockParam = false;

  if (self.requiresDefaultBlockParameter(payload.method) && args.length < method.length - 1) {
    args.push("latest");
    addedBlockParam = true;
  }

  args.push(end);

  // avoid crash by checking to make sure that we haven't specified too many arguments
  if (
    args.length > method.length ||
    (method.minLength !== undefined && args.length < method.minLength) ||
    (method.minLength === undefined && args.length < method.length)
  ) {
    var errorMessage = `Incorrect number of arguments. Method '${payload.method}' requires `;
    if (method.minLength) {
      errorMessage += `between ${method.minLength - 1} and ${method.length - 1} arguments. `;
    } else {
      errorMessage += `exactly ${method.length - 1} arguments. `;
    }

    if (addedBlockParam) {
      errorMessage += "Including the implicit block argument, r";
    } else {
      // new sentence, capitalize it.
      errorMessage += "R";
    }
    errorMessage += `equest specified ${args.length - 1} arguments: ${JSON.stringify(args)}.`;

    return end(new Error(errorMessage));
  }

  method.apply(self, args);
};

GethApiDouble.prototype.getDelayedHandler = function(payload, next, end) {
  var self = this;
  return function(err, state) {
    if (err) {
      end(err);
    }
    self.handleRequest(payload, next, end);
  };
};

GethApiDouble.prototype.requiresDefaultBlockParameter = function(method) {
  // object for O(1) lookup.
  var methods = {
    eth_getBalance: true,
    eth_getCode: true,
    eth_getTransactionCount: true,
    eth_getStorageAt: true,
    eth_call: true,
    eth_estimateGas: true
  };

  return methods[method] === true;
};

// Handle individual requests.

GethApiDouble.prototype.eth_accounts = function(callback) {
  callback(null, Object.keys(this.state.accounts));
};

GethApiDouble.prototype.eth_blockNumber = function(callback) {
  this.state.blockNumber(function(err, result) {
    if (err) {
      return callback(err);
    }
    callback(null, to.hex(result));
  });
};

GethApiDouble.prototype.eth_coinbase = function(callback) {
  callback(null, this.state.coinbase);
};

GethApiDouble.prototype.eth_mining = function(callback) {
  callback(null, this.state.is_mining);
};

GethApiDouble.prototype.eth_hashrate = function(callback) {
  callback(null, "0x0");
};

GethApiDouble.prototype.eth_gasPrice = function(callback) {
  callback(null, utils.addHexPrefix(this.state.gasPrice()));
};

GethApiDouble.prototype.eth_getBalance = function(address, blockNumber, callback) {
  this.state.getBalance(address, blockNumber, callback);
};

GethApiDouble.prototype.eth_getCode = function(address, blockNumber, callback) {
  this.state.getCode(address, blockNumber, callback);
};

GethApiDouble.prototype.eth_getBlockByNumber = function(blockNumber, includeFullTransactions, callback) {
  this.state.blockchain.getBlock(blockNumber, function(err, block) {
    if (err) {
      if (err.message && err.message.indexOf("index out of range") >= 0) {
        return callback(null, null);
      } else {
        return callback(err);
      }
    }

    callback(null, blockHelper.toJSON(block, includeFullTransactions));
  });
};

GethApiDouble.prototype.eth_getBlockByHash = function(txHash, includeFullTransactions, callback) {
  this.eth_getBlockByNumber.apply(this, arguments);
};

GethApiDouble.prototype.eth_getBlockTransactionCountByNumber = function(blockNumber, callback) {
  this.state.blockchain.getBlock(blockNumber, function(err, block) {
    if (err) {
      if (err.message.indexOf("index out of range")) {
        // block doesn't exist
        return callback(null, 0);
      } else {
        return callback(err);
      }
    }
    callback(null, block.transactions.length);
  });
};

GethApiDouble.prototype.eth_getBlockTransactionCountByHash = function(blockHash, callback) {
  this.eth_getBlockTransactionCountByNumber.apply(this, arguments);
};

GethApiDouble.prototype.eth_getTransactionReceipt = function(hash, callback) {
  this.state.getTransactionReceipt(hash, function(err, receipt) {
    if (err) {
      return callback(err);
    }

    var result = null;

    if (receipt) {
      result = receipt.toJSON();
    }
    callback(null, result);
  });
};

GethApiDouble.prototype.eth_getTransactionByHash = function(hash, callback) {
  this.state.getTransactionReceipt(hash, function(err, receipt) {
    if (err) {
      return callback(err);
    }

    var result = null;

    if (receipt) {
      result = txhelper.toJSON(receipt.tx, receipt.block);
    }

    callback(null, result);
  });
};

GethApiDouble.prototype.eth_getTransactionByBlockHashAndIndex = function(hashOrNumber, index, callback) {
  index = to.number(index);

  this.state.getBlock(hashOrNumber, function(err, block) {
    if (err) {
      // block doesn't exist by that hash
      if (err.notFound) {
        return callback(null, null);
      } else {
        return callback(err);
      }
    }

    if (index >= block.transactions.length) {
      return callback(new Error("Transaction at index " + to.hex(index) + " does not exist in block."));
    }

    var tx = block.transactions[index];
    var result = txhelper.toJSON(tx, block);

    callback(null, result);
  });
};

GethApiDouble.prototype.eth_getTransactionByBlockNumberAndIndex = function(hashOrNumber, index, callback) {
  this.eth_getTransactionByBlockHashAndIndex(hashOrNumber, index, callback);
};

GethApiDouble.prototype.eth_getTransactionCount = function(address, blockNumber, callback) {
  this.state.getTransactionCount(address, blockNumber, (err, count) => {
    if (err && err.message && err.message.indexOf("index out of range") >= 0) {
      err = new Error("Unknown block number");
    }
    return callback(err, count);
  });
};

GethApiDouble.prototype.eth_sign = function(address, dataToSign, callback) {
  var result;
  var error;

  try {
    result = this.state.sign(address, dataToSign);
  } catch (e) {
    error = e;
  }

  callback(error, result);
};

GethApiDouble.prototype.eth_signTypedData = function(address, typedDataToSign, callback) {
  var result;
  var error;

  try {
    result = this.state.signTypedData(address, typedDataToSign);
  } catch (e) {
    error = e;
  }

  callback(error, result);
};

GethApiDouble.prototype.eth_sendTransaction = function(txData, callback) {
  this.state.queueTransaction("eth_sendTransaction", txData, null, callback);
};

GethApiDouble.prototype.eth_sendRawTransaction = function(rawTx, callback) {
  this.state.queueRawTransaction(rawTx, callback);
};

GethApiDouble.prototype.eth_call = function(txData, blockNumber, callback) {
  if (!txData.gas) {
    txData.gas = this.state.blockchain.blockGasLimit;
  }

  this.state.queueTransaction("eth_call", txData, blockNumber, callback); // :(
};

GethApiDouble.prototype.eth_estimateGas = function(txData, blockNumber, callback) {
  if (!txData.gas) {
    txData.gas = this.state.blockchain.blockGasLimit;
  }
  this.state.queueTransaction("eth_estimateGas", txData, blockNumber, callback);
};

GethApiDouble.prototype.eth_getStorageAt = function(address, position, blockNumber, callback) {
  this.state.queueStorage(address, position, blockNumber, callback);
};

GethApiDouble.prototype.eth_newBlockFilter = function(callback) {
  var filterId = utils.addHexPrefix(utils.intToHex(this.state.latestFilterId));
  this.state.latestFilterId += 1;
  callback(null, filterId);
};

GethApiDouble.prototype.eth_getFilterChanges = function(filterId, callback) {
  var blockHash = this.state
    .latestBlock()
    .hash()
    .toString("hex");
  // Mine a block after each request to getFilterChanges so block filters work.
  this.state.mine();
  callback(null, [blockHash]);
};

GethApiDouble.prototype.eth_getLogs = function(filter, callback) {
  this.state.getLogs(filter, callback);
};

GethApiDouble.prototype.eth_uninstallFilter = function(filterId, callback) {
  callback(null, true);
};

GethApiDouble.prototype.eth_protocolVersion = function(callback) {
  callback(null, "63");
};

GethApiDouble.prototype.bzz_hive = function(callback) {
  callback(null, []);
};

GethApiDouble.prototype.bzz_info = function(callback) {
  callback(null, []);
};

GethApiDouble.prototype.shh_version = function(callback) {
  callback(null, "2");
};

GethApiDouble.prototype.eth_getCompilers = function(callback) {
  callback(null, []);
};

GethApiDouble.prototype.eth_syncing = function(callback) {
  callback(null, false);
};

GethApiDouble.prototype.net_listening = function(callback) {
  callback(null, true);
};

GethApiDouble.prototype.net_peerCount = function(callback) {
  callback(null, 0);
};

GethApiDouble.prototype.web3_clientVersion = function(callback) {
  callback(null, "EthereumJS TestRPC/v" + pkg.version + "/ethereum-js");
};

GethApiDouble.prototype.web3_sha3 = function(string, callback) {
  callback(null, to.hex(utils.sha3(string)));
};

GethApiDouble.prototype.net_version = function(callback) {
  // net_version returns a string containing a base 10 integer.
  callback(null, this.state.net_version + "");
};

GethApiDouble.prototype.miner_start = function(threads, callback) {
  if (!callback && typeof threads === "function") {
    callback = threads;
    threads = null;
  }

  this.state.startMining(function(err) {
    callback(err, true);
  });
};

// indicate that `miner_start` only requires one argument (the callback)
GethApiDouble.prototype.miner_start.minLength = 1;

GethApiDouble.prototype.miner_stop = function(callback) {
  this.state.stopMining(function(err) {
    callback(err, true);
  });
};

GethApiDouble.prototype.rpc_modules = function(callback) {
  // returns the availible api modules and versions
  callback(null, { eth: "1.0", net: "1.0", rpc: "1.0", web3: "1.0", evm: "1.0", personal: "1.0" });
};

GethApiDouble.prototype.personal_listAccounts = function(callback) {
  callback(null, Object.keys(this.state.personal_accounts));
};

GethApiDouble.prototype.personal_newAccount = function(password, callback) {
  var account = this.state.createAccount({ generate: true });
  this.state.accounts[account.address.toLowerCase()] = account;
  this.state.personal_accounts[account.address.toLowerCase()] = true;
  this.state.account_passwords[account.address.toLowerCase()] = password;
  callback(null, account.address);
};

GethApiDouble.prototype.personal_importRawKey = function(rawKey, password, callback) {
  var account = this.state.createAccount({ secretKey: rawKey });
  this.state.accounts[account.address.toLowerCase()] = account;
  this.state.personal_accounts[account.address.toLowerCase()] = true;
  this.state.account_passwords[account.address.toLowerCase()] = password;
  callback(null, account.address);
};

GethApiDouble.prototype.personal_lockAccount = function(address, callback) {
  var account = this.state.personal_accounts[address.toLowerCase()];
  if (account !== true) {
    var error = "Account not found";
    return callback(error);
  }
  delete this.state.unlocked_accounts[address.toLowerCase()];
  callback(null, true);
};

GethApiDouble.prototype.personal_unlockAccount = function(address, password, duration, callback) {
  // FIXME handle duration
  var account = this.state.personal_accounts[address.toLowerCase()];
  if (account !== true) {
    var accountError = "Account not found";
    return callback(accountError);
  }

  var storedPassword = this.state.account_passwords[address.toLowerCase()];
  if (storedPassword !== undefined && storedPassword !== password) {
    var passwordError = "Invalid password";
    return callback(passwordError);
  }

  this.state.unlocked_accounts[address.toLowerCase()] = true;
  callback(null, true);
};

GethApiDouble.prototype.personal_sendTransaction = function(txData, password, callback) {
  if (txData.from == null) {
    var error = "Sender not found";
    callback(error);
    return;
  }

  var from = utils.addHexPrefix(txData.from).toLowerCase();

  var self = this;
  self.personal_unlockAccount(from, password, null, function(err) {
    if (err) {
      return callback(err);
    }

    self.state.queueTransaction("eth_sendTransaction", txData, null, function(err, ret) {
      self.state.unlocked_accounts[from.toLowerCase()] = false;
      callback(err, ret);
    });
  });
};

/* Functions for testing purposes only. */

GethApiDouble.prototype.evm_snapshot = function(callback) {
  this.state.snapshot(callback);
};

GethApiDouble.prototype.evm_revert = function(snapshotId, callback) {
  this.state.revert(snapshotId, callback);
};

GethApiDouble.prototype.evm_increaseTime = function(seconds, callback) {
  callback(null, this.state.blockchain.increaseTime(seconds));
};

GethApiDouble.prototype.evm_setTime = function(date, callback) {
  callback(null, this.state.blockchain.setTime(date));
};

GethApiDouble.prototype.evm_mine = function(timestamp, callback) {
  if (typeof timestamp === "function") {
    callback = timestamp;
    timestamp = undefined;
  }
  this.state.processBlock(timestamp, function(err) {
    if (err) {
      return callback(err);
    }
    callback(err, "0x0");
  });
};

// indicate that `evm_mine` only requires one argument (the callback)
GethApiDouble.prototype.evm_mine.minLength = 1;

GethApiDouble.prototype.debug_traceTransaction = function(txHash, params, callback) {
  if (typeof params === "function") {
    callback = params;
    params = [];
  }

  this.state.queueTransactionTrace(txHash, params, callback);
};

module.exports = GethApiDouble;
