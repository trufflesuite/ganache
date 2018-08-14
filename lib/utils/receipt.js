var to = require("./to");

function Receipt(tx, block, logs, gasUsed, contractAddress, status, logsBloom) {
  this.tx = tx;
  this.block = block;
  this.logs = logs;
  this.gasUsed = gasUsed;
  this.contractAddress = contractAddress;
  this.status = status;
  this.logsBloom = logsBloom;

  this.transactionIndex = 0;

  for (var i = 0; i < block.transactions.length; i++) {
    var current = block.transactions[i];
    if (current.hash().equals(tx.hash())) {
      this.transactionIndex = i;
      break;
    }
  }
}

Receipt.prototype.toJSON = function() {
  if (this.data != null) return data;

  // Enforce Hex formatting as defined in the RPC spec.
  return {
    transactionHash: to.rpcDataHexString(this.tx.hash()),
    transactionIndex: to.rpcQuantityHexString(this.transactionIndex),
    blockHash: to.rpcDataHexString(this.block.hash()),
    blockNumber: to.rpcQuantityHexString(this.block.header.number),
    gasUsed: to.rpcQuantityHexString(this.gasUsed),
    cumulativeGasUsed: to.rpcQuantityHexString(this.block.header.gasUsed),
    contractAddress: this.contractAddress != null ? to.rpcDataHexString(this.contractAddress) : null,
    logs: this.logs.map(function(log) {return log.toJSON()}),
    status: to.rpcQuantityHexString(this.status),
    logsBloom: to.rpcDataHexString(this.logsBloom)
  }
};

module.exports = Receipt;
