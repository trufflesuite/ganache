var BN = require('bn.js');
var Web3 = require('web3');
var Ganache = require("../index.js");
var assert = require('assert');
var to = require("../lib/utils/to.js");
var solc = require("solc");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

describe("Mining", function() {
  var web3 = new Web3(Ganache.provider({
    vmErrorsOnRPCResponse: true
    //logger: console,
  }));
  var accounts;
  var snapshot_id;
  var badBytecode;
  var goodBytecode;

  before("compile solidity code that causes runtime errors", function() {
    this.timeout(10000)
    return compileSolidity("pragma solidity ^0.4.2; contract Example { function Example() {throw;} }").then(function(result) {
      badBytecode = result.code;
    });
  });

  before("compile solidity code that causes an event", function() {
    this.timeout(10000)
    return compileSolidity("pragma solidity ^0.4.2; contract Example { event Event(); function Example() { Event(); } }").then(function(result) {
      goodBytecode = result.code;
    });
  });

  beforeEach("checkpoint, so that we can revert later", function(done) {
    web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "evm_snapshot",
      id: new Date().getTime()
    }, function(err, res) {
      if (!err) {
        snapshot_id = res.result;
      }
      done(err);
    });
  });

  afterEach("revert back to checkpoint", function(done) {
    web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "evm_revert",
      params: [snapshot_id],
      id: new Date().getTime()
    }, done);
  });

  // Everything's a Promise to add in readibility.
  function getBlockNumber() {
    return new Promise(function(accept, reject) {
      web3.eth.getBlockNumber(function(err, number) {
        if (err) return reject(err);
        accept(to.number(number));
      });
    });
  };

  function startMining() {
    return new Promise(function(accept, reject) {
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "miner_start",
        params: [1],
        id: new Date().getTime()
      }, function(err) {
        if (err) return reject(err);
        accept();
      });
    });
  }

  function stopMining() {
    return new Promise(function(accept, reject) {
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "miner_stop",
        id: new Date().getTime()
      }, function(err) {
        if (err) return reject(err);
        accept();
      });
    });
  }

  function checkMining() {
    return new Promise(function(accept, reject) {
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "eth_mining",
        id: new Date().getTime()
      }, function(err, res) {
        if (err) return reject(err);
        accept(res.result);
      });
    });
  }

  function mineSingleBlock() {
    return new Promise(function(accept, reject) {
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_mine",
        id: new Date().getTime()
      }, function(err, result) {
        if (err) return reject(err);
        assert.deepEqual(result.result, "0x0");
        accept(result);
      })
    });
  }

  function queueTransaction(from, to, gasLimit, value, data) {
    return new Promise(function(accept, reject) {
      web3.eth.sendTransaction({
        from: from,
        to: to,
        gas: gasLimit,
        value: value,
        data: data
      }, function(err, tx) {
        if (err) return reject(err);
        accept(tx);
      });
    })
  }

  function getReceipt(tx) {
    return new Promise(function(accept, reject) {
      web3.eth.getTransactionReceipt(tx, function(err, result) {
        if (err) return reject(err);
        accept(result);
      });
    });
  };

  function getCode(address) {
    return new Promise(function(accept, reject) {
      web3.eth.getCode(address, function(err, result) {
        if (err) return reject(err);
        accept(result);
      });
    });
  };

  function compileSolidity(source) {
    return new Promise(function(accept, reject) {
      var result = solc.compile({sources: {"Contract.sol": source}});
      accept({code: "0x" + result.contracts[Object.keys(result.contracts)[0]].bytecode})
    });
  };

  before(function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);
      accounts = accs;
      done();
    });
  });

  it("should mine a single block with two queued transactions", function() {
    var tx1, tx2, blockNumber;

    return stopMining().then(function() {
      return getBlockNumber();
    }).then(function(number) {
      blockNumber = number;
      return queueTransaction(accounts[0], accounts[1], 90000, web3.utils.toWei(new BN(2), "ether"));
    }).then(function(tx) {
      tx1 = tx;
      return getReceipt(tx);
    }).then(function(receipt) {
      assert.equal(receipt, null);

      return queueTransaction(accounts[0], accounts[1], 90000, web3.utils.toWei(new BN(3), "ether"));
    }).then(function(tx) {
      tx2 = tx;
      return getReceipt(tx);
    }).then(function(receipt) {
      assert.equal(receipt, null);

      return startMining();
    }).then(function() {
      return Promise.all([getReceipt(tx1), getReceipt(tx2)]);
    }).then(function(receipts) {
      assert.equal(receipts.length, 2);
      assert.notEqual(receipts[0], null);
      assert.equal(receipts[0].transactionHash, tx1);
      assert.notEqual(receipts[1], null);
      assert.equal(receipts[1].transactionHash, tx2);
      assert.equal(receipts[0].blockNumber, receipts[1].blockNumber, "Transactions should be mined in the same block.");

      return getBlockNumber();
    }).then(function(number) {
      assert.equal(number, blockNumber + 1);
    });
  });

  it("should mine two blocks when two queued transactions won't fit into a single block", function() {
    // This is a very similar test to the above, except the gas limits are much higher
    // per transaction. This means the Ganache will react differently and process
    // each transaction it its own block.

    var tx1, tx2, blockNumber;

    return stopMining().then(function() {
      return getBlockNumber();
    }).then(function(number) {
      blockNumber = number;
      return queueTransaction(accounts[0], accounts[1], 4000000, web3.utils.toWei(new BN(2), "ether"));
    }).then(function(tx) {
      tx1 = tx;
      return getReceipt(tx);
    }).then(function(receipt) {
      assert.equal(receipt, null);

      return queueTransaction(accounts[0], accounts[1], 4000000, web3.utils.toWei(new BN(3), "ether"));
    }).then(function(tx) {
      tx2 = tx;
      return getReceipt(tx);
    }).then(function(receipt) {
      assert.equal(receipt, null);

      return startMining();
    }).then(function() {
      return Promise.all([getReceipt(tx1), getReceipt(tx2)]);
    }).then(function(receipts) {
      assert.equal(receipts.length, 2);
      assert.notEqual(receipts[0], null);
      assert.equal(receipts[0].transactionHash, tx1);
      assert.notEqual(receipts[1], null);
      assert.equal(receipts[1].transactionHash, tx2);
      assert.notEqual(receipts[0].blockNumber, receipts[1].blockNumber, "Transactions should not be mined in the same block.");

      return getBlockNumber();
    }).then(function(number) {
      assert.equal(number, blockNumber + 2);
    });
  });

  it("should mine one block when requested, and only one transaction, when two queued transactions together are larger than a single block", function() {
    // This is a very similar test to the above, except we don't start mining again,
    // we only mine one block by request.

    var tx1, tx2, blockNumber;

    return stopMining().then(function() {
      return getBlockNumber();
    }).then(function(number) {
      blockNumber = number;
      return queueTransaction(accounts[0], accounts[1], 4000000, web3.utils.toWei(new BN(2), "ether"));
    }).then(function(tx) {
      tx1 = tx;
      return getReceipt(tx);
    }).then(function(receipt) {
      assert.equal(receipt, null);

      return queueTransaction(accounts[0], accounts[1], 4000000, web3.utils.toWei(new BN(3), "ether"));
    }).then(function(tx) {
      tx2 = tx;
      return getReceipt(tx);
    }).then(function(receipt) {
      assert.equal(receipt, null);

      return mineSingleBlock();
    }).then(function() {
      return Promise.all([getReceipt(tx1), getReceipt(tx2)]);
    }).then(function(receipts) {
      assert.equal(receipts.length, 2);
      assert.notEqual(receipts[0], null);
      assert.equal(receipts[0].transactionHash, tx1);
      assert.equal(receipts[1], null);

      return getBlockNumber();
    }).then(function(number) {
      assert.equal(number, blockNumber + 1);
    });
  });

  it("should error if queued transaction exceeds the block gas limit", function() {
    return stopMining().then(function() {
      return queueTransaction(accounts[0], accounts[1], 10000000, web3.utils.toWei(new BN(2), "ether"));
    }).then(function(tx) {
      // It should never get here.
      throw new Error("Transaction was processed without erroring; gas limit should have been too high");
    }).catch(function(err) {
      // We caught an error like we expected. Ensure it's the right error, or rethrow.
      if (err.message.toLowerCase().indexOf("exceeds block gas limit") < 0) {
        throw new Error("Did not receive expected error; instead received: " + err);
      }
    });
  });

  it("should error via instamining when queued transaction throws a runtime errors", function(done) {
    var tx1, tx2, blockNumber, bytecode, address;

    startMining().then(function() {
      // This transaction should be processed immediately.
      return queueTransaction(accounts[0], null, 3141592, 0, badBytecode);
    }).then(function(tx) {
      throw new Error("Execution should never get here as we expected `eth_sendTransaction` to throw an error")
    }).catch(function(err) {
      if (err.message.indexOf("VM Exception while processing transaction") != 0) {
        return done(new Error("Received error we didn't expect: " + err));
      }
      // We got the error we wanted. Test passed!
      done();
    });
  });

  it("should error via evm_mine when queued transaction throws a runtime errors", function(done) {
    var tx1, tx2, blockNumber, bytecode, address;

    stopMining().then(function() {
      return queueTransaction(accounts[0], null, 3141592, 0, badBytecode);
    }).then(function(tx) {
      tx1 = tx;
      return mineSingleBlock();
    }).then(function() {
      throw new Error("Execution should never get here as we expected `evm_mine` to throw an error")
    }).catch(function(err) {
      if (err.message.indexOf("VM Exception while processing transaction") != 0) {
        return done(new Error("Received error we didn't expect: " + err));
      }
      // We got the error we wanted. Test passed!
      done();
    });
  });

  it("should error via evm_mine when multiple queued transactions throw runtime errors in a single block", function(done) {
    var tx1, tx2, blockNumber, bytecode;

    // Note: The two transactions queued in this test do not exceed the block gas limit
    // and thus should fit within a single block.

    stopMining().then(function() {
      return queueTransaction(accounts[0], null, 1000000, 0, badBytecode);
    }).then(function(tx) {
      return queueTransaction(accounts[0], null, 1000000, 0, badBytecode);
    }).then(function(tx) {
      return mineSingleBlock();
    }).then(function() {
      throw new Error("Execution should never get here as we expected `evm_mine` to throw an error")
    }).catch(function(err) {
      if (err.message.indexOf("Multiple VM Exceptions while processing transactions") != 0) {
        return done(new Error("Received error we didn't expect: " + err));
      }
      // We got the error we wanted. Test passed!
      done();
    });
  });

  it("should error via miner_start when multiple queued transactions throw runtime errors in multiple blocks", function(done) {
    var blockNumber, bytecode;

    // Note: The two transactions queued in this test together DO exceed the block gas limit
    // and thus will fit in two blocks, one block each.

    stopMining().then(function() {
      return queueTransaction(accounts[0], null, 3141592, 0, badBytecode);
    }).then(function(tx) {
      return queueTransaction(accounts[0], null, 3141592, 0, badBytecode);
    }).then(function(tx) {
      return startMining();
    }).then(function() {
      throw new Error("Execution should never get here as we expected `miner_start` to throw an error")
    }).catch(function(err) {
      if (err.message.indexOf("Multiple VM Exceptions while processing transactions") != 0) {
        return done(new Error("Received error we didn't expect: " + err));
      }
      // We got the error we wanted. Test passed!
      done();
    });
  });

  it("even if we receive a runtime error, logs for successful transactions need to be processed", function(done) {
    var tx1, tx2, blockNumber, bytecode;

    // Note: The two transactions queued in this test should exist within the same block.

    stopMining().then(function() {
      return queueTransaction(accounts[0], null, 1000000, 0, badBytecode);
    }).then(function(tx) {
      tx1 = tx;
      return queueTransaction(accounts[0], null, 1000000, 0, goodBytecode);
    }).then(function(tx) {
      tx2 = tx;
      return startMining();
    }).then(function() {
      throw new Error("Execution should never get here as we expected `miner_start` to throw an error")
    }).catch(function(err) {
      if (err.message.indexOf("VM Exception while processing transaction") != 0) {
        return done(new Error("Received error we didn't expect: " + err));
      }
      // We got the error we wanted. Now check to see if the transaction was processed correctly.
      getReceipt(tx2).then(function(receipt) {
        // We should have a receipt for the second transaction - it should have been processed.
        assert.notEqual(receipt, null);
        // It also should have logs.
        assert.notEqual(receipt.logs.length, 0);

        // Now check that there's code at the address, which means it deployed successfully.
        return getCode(receipt.contractAddress);
      }).then(function(code) {
        // Convert hex to a big number and ensure it's not zero.
        assert(web3.utils.toBN(code).eq(0) == false);

        // Hot diggety dog!
        done();
      });
    });
  });

  it("should return the correct value for eth_mining when miner started and stopped", function() {
    return stopMining().then(function() {
      return checkMining();
    }).then(function(is_mining) {
      assert(!is_mining);
      return startMining();
    }).then(function() {
      return checkMining();
    }).then(function(is_mining) {
      assert(is_mining);
    });
  });
});
