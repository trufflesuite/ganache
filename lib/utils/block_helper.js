var to = require("./to");
var txhelper = require("./txhelper")

module.exports = {
  toJSON: function(block, include_full_transactions) {
    return {
      number: to.rpcQuantityHexString(block.header.number),
      hash: to.hex(block.hash()),
      parentHash: to.hex(block.header.parentHash), //common.hash
      mixHash: "0x" + (new Array(32).fill("10").join("")), // TODO: Figure out what to do here.
      nonce: to.rpcDataHexString(to.hex(block.header.nonce), 16),
      sha3Uncles: to.hex(block.header.uncleHash),
      logsBloom: to.hex(block.header.bloom),
      transactionsRoot: to.hex(block.header.transactionsTrie),
      stateRoot: to.hex(block.header.stateRoot),
      receiptsRoot: to.hex(block.header.receiptTrie),
      miner: to.hex(block.header.coinbase),
      difficulty: to.hex(block.header.difficulty),
      totalDifficulty: to.hex(block.header.difficulty), // TODO: Figure out what to do here.
      extraData: to.rpcDataHexString(to.hex(block.header.extraData)),
      size: to.hex(1000), // TODO: Do something better here
      gasLimit: to.hex(block.header.gasLimit),
      gasUsed: to.hex(block.header.gasUsed),
      timestamp: to.hex(block.header.timestamp),
      transactions: block.transactions.map(function(tx) {
        if (include_full_transactions) {
          return txhelper.toJSON(tx, block);
        } else {
          return to.hex(tx.hash());
        }
      }),
      uncles: []//block.uncleHeaders.map(function(uncleHash) {return to.hex(uncleHash)})
    }
  }
}
