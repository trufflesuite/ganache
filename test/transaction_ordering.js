const assert = require("assert");
const to = require("../lib/utils/to.js");
const initializeTestProvider = require("./helpers/web3/initializeTestProvider");

describe("Transaction Ordering", function() {
  let context;

  before("Setting up accounts and provider", async function() {
    context = await initializeTestProvider();
  });

  beforeEach(function(done) {
    const { provider } = context;
    provider.send(
      {
        jsonrpc: "2.0",
        method: "miner_stop"
      },
      done
    );
  });

  afterEach(function(done) {
    const { provider } = context;
    provider.send(
      {
        jsonrpc: "2.0",
        method: "miner_start",
        params: [1]
      },
      done
    );
  });

  it("should order queued transactions correctly by nonce before adding to the block", function(done) {
    const { accounts, provider, web3 } = context;

    const txData = {
      to: accounts[1],
      from: accounts[0],
      value: 0x1,
      nonce: 0,
      gas: 21000
    };

    web3.eth.sendTransaction(txData, function(err, tx) {
      if (err) {
        return done(err);
      }
      txData.nonce = 1;
      web3.eth.sendTransaction(txData, function(err, tx) {
        if (err) {
          return done(err);
        }
        provider.send(
          {
            jsonrpc: "2.0",
            method: "miner_start",
            params: [1]
          },
          async function(err, tx) {
            if (err) {
              return done(err);
            }
            const block = await web3.eth.getBlock("latest");
            assert.strictEqual(block.transactions.length, 2, "Latest block should have two transactions");
            done();
          }
        );
      });
    });
  });

  it("should order queued transactions correctly by price before adding to the block", function(done) {
    const { accounts, provider, web3 } = context;

    const txData = {
      to: accounts[1],
      from: accounts[0],
      value: 0x1,
      gas: 21000,
      gasPrice: 0x1
    };

    web3.eth.sendTransaction(txData, function(err, tx) {
      if (err) {
        return done(err);
      }
      txData.gasPrice = 2;
      txData.from = accounts[1];
      web3.eth.sendTransaction(txData, function(err, tx) {
        if (err) {
          return done(err);
        }
        provider.send(
          {
            jsonrpc: "2.0",
            method: "miner_start",
            params: [1]
          },
          async function(err, tx) {
            if (err) {
              return done(err);
            }
            const block = await web3.eth.getBlock("latest", true);
            assert.strictEqual(block.transactions.length, 2, "Latest block should have two transactions");
            assert.strictEqual(to.number(block.transactions[0].gasPrice), 2);
            assert.strictEqual(to.number(block.transactions[1].gasPrice), 1);
            done();
          }
        );
      });
    });
  });
});
