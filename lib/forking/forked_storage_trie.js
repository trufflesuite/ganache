const Sublevel = require("level-sublevel");
const MerklePatriciaTree = require("merkle-patricia-tree");
const BaseTrie = require("merkle-patricia-tree/baseTrie");
const checkpointInterface = require("merkle-patricia-tree/checkpoint-interface");
const Account = require("ethereumjs-account").default;
var utils = require("ethereumjs-util");
var inherits = require("util").inherits;
var Web3 = require("web3");
var to = require("../utils/to.js");

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
  let blockNumberProvided = true;

  // Allow an optional blockNumber
  if (typeof blockNumber === "function") {
    callback = blockNumber;
    blockNumber = this.forkBlockNumber;
    blockNumberProvided = false;
  }

  key = utils.toBuffer(key);

  // If the account/key doesn't exist in our state trie, get it off the wire.
  this.keyExists(key, function(err, exists) {
    if (err) {
      return callback(err);
    }

    if (exists) {
      // I'm checking to see if a blockNumber is provided because the below
      // logic breaks for things like nonce lookup, in which we should just
      // use the root trie as is. I'm guessing there's a cleaner architecture
      // that doesn't require such checks
      if (blockNumberProvided) {
        // this logic is heavily influenced by BlockchainDouble.prototype.getStorage
        // but some adjustments were necessary due to the ForkedStorageTrieBase context
        self.blockchain.getBlock(blockNumber, function(err, block) {
          if (err) {
            return callback(err);
          }

          // Manipulate the state root in place to maintain checkpoints
          const currentStateRoot = self.root;
          self.root = block.header.stateRoot;

          MerklePatriciaTree.prototype.get.call(self, utils.toBuffer(self.address), function(err, data) {
            if (err != null) {
              // Put the stateRoot back if there's an error
              self.root = currentStateRoot;
              return callback(err);
            }

            const account = new Account(data);

            self.root = account.stateRoot;
            MerklePatriciaTree.prototype.get.call(self, key, function(err, value) {
              // Finally, put the stateRoot back for good
              self.root = currentStateRoot;

              if (err != null) {
                return callback(err, value);
              }

              callback(null, value);
            });
          });
        });
      } else {
        MerklePatriciaTree.prototype.get.call(self, key, function(err, r) {
          callback(err, r);
        });
      }
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

const originalPut = ForkedStorageBaseTrie.prototype.put;
ForkedStorageBaseTrie.prototype.put = function(key, value, callback) {
  let rpcKey = to.rpcDataHexString(key);
  if (this.address) {
    rpcKey = `${to.rpcDataHexString(this.address)};${rpcKey}`;
  }
  this._deleted.get(rpcKey, (_, result) => {
    if (result === 1) {
      this._deleted.put(rpcKey, 0, () => {
        originalPut.call(this, key, value, callback);
      });
    } else {
      originalPut.call(this, key, value, callback);
    }
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
