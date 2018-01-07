var MerklePatriciaTree = require("merkle-patricia-tree");
var Account = require("ethereumjs-account");
var utils = require('ethereumjs-util')
var inherits = require("util").inherits;
var Web3 = require("web3");
var to = require("./to.js");
var async = require("async");

inherits(ForkedStorageTrie, MerklePatriciaTree)

function ForkedStorageTrie(db, root, options) {
  MerklePatriciaTree.call(this, db, root);

  this.address = options.address;

  this.fork = options.fork;
  this.fork_block_number = options.fork_block_number;

  this.blockchain = options.blockchain;

  this.web3 = new Web3();
  this.web3.setProvider(this.fork);

  this.checkpoints = [];
}

ForkedStorageTrie.prototype.keyExists = function(key, callback) {
  key = utils.toBuffer(key);

  this.findPath(key, function (err, node, remainder, stack) {
    var exists = false;
    if (node && remainder.length === 0) {
      exists = true;
    }
    callback(err, exists)
  })
};

// Note: This overrides a standard method whereas the other methods do not.
ForkedStorageTrie.prototype.get = function(key, block_number, callback) {
  var self = this;

  // Allow an optional block_number
  if (typeof block_number == "function") {
    callback = block_number;
    block_number = self.fork_block_number;
  }

  // For geth; https://github.com/ethereumjs/ethereumjs-util/issues/79
  block_number = to.rpcQuantityHexString(block_number);

  key = utils.toBuffer(key);

  // If the account doesn't exist in our state trie, get it off the wire.
  this.keyExists(key, function(err, exists) {
    if (err) return callback(err);

    if (exists) {
      MerklePatriciaTree.prototype.get.call(self, key, function(err, r) {
        callback(err, r);
      });
    } else {
      // If this is the main trie, get the whole account.
      if (self.address == null) {
        self.blockchain.fetchAccountFromFallback(key, block_number, function(err, account) {
          if (err) return callback(err);

          callback(null, account.serialize());
        });
      } else {
        self.web3.eth.getStorageAt(to.hex(self.address), to.hex(key), block_number, function(err, value) {
          if (err) return callback(err);

          value = utils.toBuffer(value);
          value = utils.rlp.encode(value);

          callback(null, value);
        });
      }
    }
  });
};

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
