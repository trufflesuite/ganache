var to = require("../utils/to");
var Receipt = require("../utils/receipt");
var async = require("async");

function ReceiptSerializer(database) {
  this.database = database;
};

ReceiptSerializer.prototype.encode = function(receipt, done) {
  done(null, receipt.toJSON());
};

ReceiptSerializer.prototype.decode = function(json, done) {
  var self = this;

  this.database.transactions.get(json.transactionHash, function(err, tx) {
    if (err) return done(err);

    self.database.blockHashes.get(json.blockHash, function(err, blockIndex) {
      if (err) return done(err);

      async.parallel({
        block: self.database.blocks.get.bind(self.database.blocks, blockIndex),
        logs: self.database.blockLogs.get.bind(self.database.blockLogs, blockIndex)
      }, function(err, result) {
        if (err) return done(err);

        done(null, new Receipt(tx, result.block, result.logs, json.gasUsed, json.contractAddress, json.status, json.logsBloom));
      });
    });
  });
};

module.exports = ReceiptSerializer;
