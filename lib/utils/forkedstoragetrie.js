const MerklePatriciaTree = require("merkle-patricia-tree");
const BaseTrie = require("merkle-patricia-tree/baseTrie");
const checkpointInterface = require("merkle-patricia-tree/checkpoint-interface");
var utils = require("ethereumjs-util");
var inherits = require("util").inherits;
var Web3 = require("web3");
var to = require("./to.js");

inherits(ForkedStorageBaseTrie, BaseTrie);

function ForkedStorageBaseTrie(db, root, options) {
  BaseTrie.apply(this, arguments);

  this.options = options;
  this.address = options.address;

  this.fork = options.fork;
  this.forkBlockNumber = options.forkBlockNumber;

  this.blockchain = options.blockchain;

  this.web3 = new Web3(this.fork);

  this.checkpoints = [];
}

// Note: This overrides a standard method whereas the other methods do not.
ForkedStorageBaseTrie.prototype.get = function(key, blockNumber, callback) {
  var self = this;

  // Allow an optional blockNumber
  if (typeof blockNumber === "function") {
    callback = blockNumber;
    blockNumber = self.forkBlockNumber;
  }

  // For geth; https://github.com/ethereumjs/ethereumjs-util/issues/79
  blockNumber = to.rpcQuantityHexString(blockNumber);

  if (blockNumber === 0) {
    return callback(null, "0x");
  }

  key = utils.toBuffer(key);

  // If the account doesn't exist in our state trie, get it off the wire.
  this.keyExists(key, function(err, exists) {
    if (err) {
      return callback(err);
    }

    if (exists) {
      MerklePatriciaTree.prototype.get.call(self, key, function(err, r) {
        callback(err, r);
      });
    } else {
      // If this is the main trie, get the whole account.
      if (self.address == null) {
        self.blockchain.fetchAccountFromFallback(key, blockNumber, function(err, account) {
          if (err) {
            return callback(err);
          }

          callback(null, account.serialize());
        });
      } else {
        self.web3.eth.getStorageAt(to.hex(self.address), to.hex(key), blockNumber, function(err, value) {
          if (err) {
            return callback(err);
          }

          value = utils.toBuffer(value);
          value = utils.rlp.encode(value);

          callback(null, value);
        });
      }
    }
  });
};

ForkedStorageBaseTrie.prototype.keyExists = function(key, callback) {
  key = utils.toBuffer(key);

  this.findPath(key, function(err, node, remainder, stack) {
    var exists = false;
    if (node && remainder.length === 0) {
      exists = true;
    }
    callback(err, exists);
  });
};

ForkedStorageBaseTrie.prototype.copy = function() {
  const trie = new ForkedStorageBaseTrie(this.db, this.root, this.options);
  return trie;
};

inherits(ForkedStorageTrie, ForkedStorageBaseTrie);

function ForkedStorageTrie(db, root, options) {
  ForkedStorageBaseTrie.call(this, db, root, options);
  checkpointInterface(this);
}

ForkedStorageTrie.prove = MerklePatriciaTree.prove;
ForkedStorageTrie.verifyProof = MerklePatriciaTree.verifyProof;

// I don't want checkpoints to be removed by commits.
// Note: For some reason, naming this function checkpoint()
// -- overriding the default function -- prevents it from
// being called.
ForkedStorageTrie.prototype.customCheckpoint = function() {
  this.checkpoints.push(this.root);
};

ForkedStorageTrie.prototype.customRevert = function() {
  this.root = this.checkpoints.pop();
};

module.exports = ForkedStorageTrie;
