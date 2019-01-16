var Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
var assert = require("assert-match");
var BN = require("bn.js");
var Web3 = require("web3");
var utils = require("ethereumjs-util");

function send(provider, method, params, callback) {
  if (typeof params === "function") {
    callback = params;
    params = [];
  }

  provider.send(
    {
      jsonrpc: "2.0",
      method: method,
      params: params || [],
      id: new Date().getTime()
    },
    callback
  );
}

describe("Protocol Options with Instamining", function() {
  var startTime = new Date("Wed Aug 24 2016 00:00:00 GMT-0700 (PDT)");
  var provider = Ganache.provider({
    time: startTime
  });

  var protocolOptionsBeforeChange;

  before("get current protocol options", function(done) {
    protocolOptionsBeforeChange = {
      gasLimit: provider.manager.state.blockchain.blockGasLimit
    };
    done();
  });

  it("should change the protocol options", function(done) {
    const gasLimit = "0x4201b8";
    const options = {
      gasLimit
    };

    send(provider, "ganache_setProtocolOptions", [options], function(err, response) {
      if (err) {
        return done(err);
      }
      const { result } = response;

      assert(result !== protocolOptionsBeforeChange.gasLimit, "should have changed the protocol block gas limit");
      assert.strictEqual(
        result,
        gasLimit,
        "should have changed the protocol block gas limit to the specified gasLimit"
      );
      done();
    });
  });
});

describe("Protocol Options with Interval Mining", function() {
  let web3, accounts;

  beforeEach(async() => {
    // start interval mining
    var startTime = new Date("Wed Aug 24 2016 00:00:00 GMT-0700 (PDT)");
    web3 = new Web3(
      Ganache.provider({
        blockTime: 0.5,
        time: startTime
      })
    );
    accounts = await web3.eth.getAccounts();
  });

  it("should mine the correct number of transactions after the block gas limit is decreased", function(done) {
    this.timeout(5000);

    const bgl = web3.currentProvider.manager.state.blockchain.blockGasLimit;
    const blockGasLimit = utils.stripHexPrefix(bgl);
    const BNBlockGasLimit = new BN(blockGasLimit, 16);

    var tx1 = {
      from: accounts[0],
      to: accounts[1],
      gas: BNBlockGasLimit.div(new BN(2)),
      value: web3.utils.toWei(new BN(2), "ether")
    };
    var tx2 = {
      from: accounts[0],
      to: accounts[1],
      gas: BNBlockGasLimit.div(new BN(2)),
      value: web3.utils.toWei(new BN(2), "ether")
    };
    // queue 2 transactions
    web3.eth.sendTransaction(tx1, (err, txHash1) => {
      if (err) {
        return done(err);
      }
      web3.eth.sendTransaction(tx2, (err, txHash2) => {
        if (err) {
          return done(err);
        }
        const options = {
          gasLimit: BNBlockGasLimit.sub(new BN(2))
        };
        // decrease block gas limit by 2
        send(web3.currentProvider, "ganache_setProtocolOptions", [options], function(err, response) {
          if (err) {
            return done(err);
          }
          // Wait .75 seconds (one and a half mining intervals) and ensure
          // first transaction has been mined && second transaction has not been mined
          setTimeout(async() => {
            const receipt1 = await web3.eth.getTransactionReceipt(txHash1);
            assert.notStrictEqual(receipt1, null);
            const receipt2 = await web3.eth.getTransactionReceipt(txHash2);
            assert.strictEqual(receipt2, null);
          }, 750);

          // Wait 1.25 seconds (two and a half mining intervals) and ensure
          // both transactions have been mined and the block numbers are different
          setTimeout(async() => {
            const [receipt1, receipt2] = await Promise.all([
              web3.eth.getTransactionReceipt(txHash1),
              web3.eth.getTransactionReceipt(txHash2)
            ]);
            assert.notStrictEqual(receipt1, null);
            assert.notStrictEqual(receipt2, null);
            assert.notStrictEqual(receipt1.blockNumber, receipt2.blockNumber);
            done();
          }, 1250);
        });
      });
    });
  });

  it("should fit more queued transactions in a block after the block gas limit has been raised", function(done) {
    this.timeout(5000);

    const bgl = web3.currentProvider.manager.state.blockchain.blockGasLimit;
    const blockGasLimit = utils.stripHexPrefix(bgl);
    const BNBlockGasLimit = new BN(blockGasLimit, 16);

    var tx1 = {
      from: accounts[0],
      to: accounts[1],
      gas: BNBlockGasLimit.div(new BN(2)),
      value: web3.utils.toWei(new BN(2), "ether")
    };
    var tx2 = {
      from: accounts[0],
      to: accounts[1],
      gas: BNBlockGasLimit.div(new BN(2)),
      value: web3.utils.toWei(new BN(2), "ether")
    };
    // queue 2 transactions
    web3.eth.sendTransaction(tx1, (err, txHash1) => {
      if (err) {
        return done(err);
      }
      web3.eth.sendTransaction(tx2, (err, txHash2) => {
        if (err) {
          return done(err);
        }

        var tx3 = {
          from: accounts[0],
          to: accounts[1],
          gas: new BN(30000),
          value: web3.utils.toWei(new BN(2), "ether")
        };

        // increase block gas limit so the third tx would fit
        const options = {
          gasLimit: BNBlockGasLimit.add(tx3.gas)
        };
        send(web3.currentProvider, "ganache_setProtocolOptions", [options], function(err, response) {
          if (err) {
            return done(err);
          }

          // queue a third tx
          web3.eth.sendTransaction(tx3, (err, txHash3) => {
            if (err) {
              return done(err);
            }

            // Wait .75 seconds (one and a half mining intervals) and ensure
            // that all three txs were mined in the same block
            setTimeout(async() => {
              const receipt1 = await web3.eth.getTransactionReceipt(txHash1);
              assert.notStrictEqual(receipt1, null);
              const receipt2 = await web3.eth.getTransactionReceipt(txHash2);
              assert.notStrictEqual(receipt2, null);
              const receipt3 = await web3.eth.getTransactionReceipt(txHash3);
              assert.notStrictEqual(receipt3, null);

              assert.strictEqual(receipt1.blockNumber, receipt2.blockNumber);
              assert.strictEqual(receipt2.blockNumber, receipt3.blockNumber);
              done();
            }, 750);
          });
        });
      });
    });
  });
});
