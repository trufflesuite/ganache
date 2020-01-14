const Sublevel = require("level-sublevel");
const MerklePatriciaTree = require("merkle-patricia-tree");
const BaseTrie = require("merkle-patricia-tree/baseTrie");
const checkpointInterface = require("merkle-patricia-tree/checkpoint-interface");
var utils = require("ethereumjs-util");
var inherits = require("util").inherits;
var Web3 = require("web3");
var to = require("./to.js");

inherits(ForkedStorageBaseTrie, BaseTrie);

function ForkedStorageBaseTrie(db, root, options) {
  BaseTrie.call(this, db, root);
  this._deleted = Sublevel(this.db).sublevel("deleted");

  this.options = options;
  this.address = options.address;
  this.forkBlockNumber = options.forkBlockNumber;
  this.blockchain = options.blockchain;
  this.fork = options.fork;
  this.web3 = new Web3(this.fork);
}

// Note: This overrides a standard method whereas the other methods do not.
ForkedStorageBaseTrie.prototype.get = function(key, blockNumber, callback) {
  var self = this;

  // Allow an optional blockNumber
  if (typeof blockNumber === "function") {
    callback = blockNumber;
    blockNumber = this.forkBlockNumber;
  }

  key = utils.toBuffer(key);

  // If the account/key doesn't exist in our state trie, get it off the wire.
  this.keyExists(key, function(err, exists) {
    if (err) {
      return callback(err);
    }

    if (exists) {
      // TODO: just because we have the key doesn't mean we're at the right
      // block number/root to send it. We need to check the block number
      // before using the data in our own trie.
      MerklePatriciaTree.prototype.get.call(self, key, function(err, r) {
        callback(err, r);
      });
    } else {
      self.keyIsDeleted(key, (err, deleted) => {
        if (err) {
          return callback(err);
        }

        if (deleted) {
          // it was deleted. return nothing.
          callback(null, Buffer.allocUnsafe(0));
          return;
        }

        // If this is the main trie, get the whole account.
        if (self.address == null) {
          self.blockchain.fetchAccountFromFallback(key, blockNumber, function(err, account) {
            if (err) {
              return callback(err);
            }

            callback(null, account.serialize());
          });
        } else {
          if (to.number(blockNumber) > to.number(self.forkBlockNumber)) {
            blockNumber = self.forkBlockNumber;
          }
          self.web3.eth.getStorageAt(to.rpcDataHexString(self.address), to.rpcDataHexString(key), blockNumber, function(
            err,
            value
          ) {
            if (err) {
              return callback(err);
            }

            value = utils.rlp.encode(value);

            callback(null, value);
          });
        }
      });
    }
  });
};

ForkedStorageBaseTrie.prototype.keyExists = function(key, callback) {
  key = utils.toBuffer(key);
  this.findPath(key, (err, node, remainder, stack) => {
    const exists = node && remainder.length === 0;
    callback(err, exists);
  });
};

ForkedStorageBaseTrie.prototype.keyIsDeleted = function(key, callback) {
  let rpcKey = to.rpcDataHexString(key);
  if (this.address) {
    rpcKey = `${to.rpcDataHexString(this.address)};${rpcKey}`;
  }
  this._deleted.get(rpcKey, (_, result) => {
    callback(null, result === 1);
  });
};

const originalDelete = ForkedStorageBaseTrie.prototype.del;
ForkedStorageBaseTrie.prototype.del = function(key, callback) {
  let rpcKey = to.rpcDataHexString(key);
  if (this.address) {
    rpcKey = `${to.rpcDataHexString(this.address)};${rpcKey}`;
  }
  this._deleted.put(rpcKey, 1, () => {
    originalDelete.call(this, key, callback);
  });
};

ForkedStorageBaseTrie.prototype.copy = function() {
  return new ForkedStorageBaseTrie(this.db, this.root, this.options);
};

inherits(ForkedStorageTrie, ForkedStorageBaseTrie);

function ForkedStorageTrie(db, root, options) {
  ForkedStorageBaseTrie.call(this, db, root, options);
  checkpointInterface(this);
}

ForkedStorageTrie.prove = MerklePatriciaTree.prove;
ForkedStorageTrie.verifyProof = MerklePatriciaTree.verifyProof;

module.exports = ForkedStorageTrie;
