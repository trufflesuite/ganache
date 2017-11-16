var Web3 = require('web3');
var Transaction = require('ethereumjs-tx');
var utils = require('ethereumjs-util');
var assert = require('assert');
var TestRPC = require("../index.js");
var solc = require("solc");
var fs = require("fs");
var to = require("../lib/utils/to");
var clone = require("clone");

var source = fs.readFileSync("./test/Example.sol", {encoding: "utf8"});
var result = solc.compile(source, 1);
var secretKeys = [
  '0xda09f8cdec20b7c8334ce05b27e6797bef01c1ad79c59381666467552c5012e3',
  '0x0d14f32c8e3ed7417fb7db52ebab63572bf7cfcd557351d4ccf19a05edeecfa5',
  '0x0d80aca78bfaf3ab47865a53e5977e285c41c028a15313f917fe78abe5a50ef7',
  '0x00af8067d4c69abca7234194f154d7f31e13c0e53dae9260432f1bcc6d1d13fb',
  '0x8939a6a37b48c47f9bc683c371dd96e819d65f6138f3b376a622ecb40379bd22',
  '0x4a3665bf95efd38cb9820ce129a26fee03927f17930924c98908c8885ca53606',
  '0x111bd4b380f2eeb0d00b025d574908d59c1bfa0030d7a69f69445c171d8cfa27',
  '0x6aff34e843c3a99fe21dcc014e3b5bf6a160a4bb8c4c470ea79acd33d9bea41f',
  '0x12ae0eb585babc60c88a74190a6074488a0d2f296124ce37f85dbec1d693906f',
  '0xd46dc75904628a0b0eaffdda6acbe2687924299995708e30d05a1e8a2a1c5d45'
];

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");


// Note: Certain properties of the following contract data are hardcoded to
// maintain repeatable tests. If you significantly change the solidity code,
// make sure to update the resulting contract data with the correct values.
var contract = {
  solidity: source,
  abi: result.contracts[":Example"].interface,
  binary: "0x" + result.contracts[":Example"].bytecode,
  runtimeBinary: '0x' + result.contracts[":Example"].runtimeBytecode,
  position_of_value: "0x0000000000000000000000000000000000000000000000000000000000000000",
  expected_default_value: 5,
  call_data: {
    gasPrice: '0x01', // This is important, as passing it has exposed errors in the past.
    to: null, // set by test
    data: '0x3fa4f245'
  },
  transaction_data: {
    from: null, // set by test
    to: null, // set by test
    data: '0x552410770000000000000000000000000000000000000000000000000000000000000019', // sets value to 25 (base 10)
    gas: 3141592
  }
};

var tests = function(web3) {
  var accounts;
  var personalAccount;

  before(function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);

      accounts = accs;

      web3.personal.newAccount("password", function(err, result) {
        personalAccount = result;
        done();
      });
    });
  });

  describe("eth_accounts", function() {
    it("should return 10 addresses", function(done) {
      assert.deepEqual(accounts.length, 10);
      done();
    });
  });

  describe("eth_blockNumber", function() {
    it("should return initial block number of zero", function(done) {
      var number = web3.eth.getBlockNumber(function(err, result) {
        if (err) return done(err);

        assert.deepEqual(result, 0);
        done();
      });

      // Note: We'll assert the block number changes on transactions.
    });
  });

  describe("eth_coinbase", function() {
    it("should return correct address", function(done) {
      web3.eth.getCoinbase(function(err, coinbase) {
        if (err) return done(err);

        assert.deepEqual(coinbase, accounts[0]);
        done();
      });
    });
  });

  describe("eth_mining", function() {
    it("should return true", function(done) {
      web3.eth.getMining(function(err, result) {
        if (err) return done(err);

        assert.deepEqual(result, true);
        done();
      });
    });
  });

  describe("eth_hashrate", function() {
    it("should return hashrate of zero", function(done) {
      web3.eth.getHashrate(function(err, result) {
        if (err) return done(err);

        assert.deepEqual(result, 0);
        done();
      });
    });
  });

  describe("eth_gasPrice", function() {
    it("should return gas price of 0.02 szabo", function(done) {
      web3.eth.getGasPrice(function(err, result) {
        if (err) return done(err);

        assert.deepEqual(result.toNumber(), 20000000000);
        done();
      });
    });
  });

  describe("eth_getBalance", function() {
    it("should return initial balance", function(done) {
      web3.eth.getBalance(accounts[0], function(err, result) {
        if (err) return done(err);

        assert.deepEqual("0x00000000000000" + result.toString(16), "0x0000000000000056bc75e2d63100000");
        done();
      });
    });

    it("should return 0 for non-existent account", function(done) {
      web3.eth.getBalance("0x1234567890123456789012345678901234567890", function(err, result) {
        if (err) return done(err);

        assert.equal("0x" + result.toString(16), "0x0");
        done();
      });
    });
  });

  describe("eth_getBlockByNumber", function() {
    it("should return block given the block number", function(done) {
      web3.eth.getBlock(0, true, function(err, block) {
        if (err) return done(err);

        var expectedFirstBlock = {
          number: 0,
          hash: block.hash, // Don't test this one
          parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          nonce: '0x0',
          sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
          logsBloom: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
          transactionsRoot: '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
          stateRoot: '0xbb762ad4242c8c2821f7ac9c0a0a7da9f073cfeed39129d4bafa9168118c3b3a',
          receiptsRoot: '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
          miner: '0x0000000000000000000000000000000000000000',
          difficulty: { s: 1, e: 0, c: [ 0 ] },
          totalDifficulty: { s: 1, e: 0, c: [ 0 ] },
          extraData: '0x0',
          size: 1000,
          gasLimit: 6721975,
          gasUsed: 0,
          timestamp: block.timestamp, // Don't test this one.
          transactions: [],
          uncles: []
        };

        assert.deepEqual(block, expectedFirstBlock);

        var now = (new Date()).getTime();
        var then = block.timestamp * 1000; // block.timestamp is in seconds.

        assert.equal(then.toString().length, now.toString().length, "Invalid timestamp length");
        assert(then < now, "Time returned was greater than the current time");
        done();
      });
    });

    it("should return null given a future block number", function(done) {
      web3.eth.getBlock(10000, true, function(err, block) {
        if (err) return done(err);

        assert.deepEqual(block, null);
        done();
      });
    });

    it("should return transactions in the block as well", function(done) {
      web3.eth.sendTransaction({
        from: accounts[0],
        data: contract.binary,
        gas: 3141592
      }, function(err, tx_hash) {
        if (err) return done(err);

        // Assume it was processed correctly.
        assert.deepEqual(tx_hash.length, 66);

        web3.eth.getBlock("latest", true, function(err, block) {
          if (err) return done(err);

          assert.equal(block.transactions.length, 1, "Latest block should have one transaction");
          assert.equal(block.transactions[0].hash, tx_hash, "Transaction hashes don't match");

          //Retest, with transaction only as hash
          web3.eth.getBlock("latest", false, function(err, block) {
            if (err) return done(err);

            assert.equal(block.transactions.length, 1, "Latest block should have one transaction");
            assert.equal(block.transactions[0], tx_hash, "Transaction hashes don't match");

            done()
          });
        });
      });
    });
  });

  // Relies on the validity of eth_getBlockByNumber above.
  describe("eth_getBlockByHash", function() {
    it("should return block given the block hash", function(done) {
      web3.eth.getBlock(0, true, function(err, blockByNumber) {
        if (err) return done(err);

        web3.eth.getBlock(blockByNumber.hash, true, function(err, blockByHash) {
          if (err) return done(err);

          assert.deepEqual(blockByHash, blockByNumber);
          done();
        });
      });
    });
  });

  describe("eth_getBlockTransactionCountByNumber", function(){
    it("should return the number of transactions given the block number (0 transactions)", function(done) {
      //Block 0 should have 0 transactions as per test eth_getBlockByNumber
      web3.eth.getBlock(0, true, function(err, block) {
        if (err) return done(err);
        web3.eth.getBlockTransactionCount(0, function(err, blockTransactionCount) {
          assert.equal(block.transactions.length, blockTransactionCount,  "Block transaction count should be 0.");
          assert.equal(0, blockTransactionCount,  "Block transaction count should be 0.");
          done();
        });
      });
    });

    it("should return the number of transactions given the block number (1 transaction)", function(done) {
      // Create a transaction and check
      // Account 0 seems to be running out of gas before all tests are complete
      var payingAccount = 2;

      web3.eth.sendTransaction({
        from: accounts[payingAccount],
        data: contract.binary,
        gas: 3141592
      }, function(err, tx_hash) {
        if (err) return done(err);
        // Assume it was processed correctly.
        assert.deepEqual(tx_hash.length, 66);

        web3.eth.getBlock("latest", true, function(err, block) {
          if (err) return done(err);
          web3.eth.getBlockTransactionCount(block.number , function(err, blockTransactionCount) {
            if (err) return done(err);
            assert.equal(block.transactions.length, blockTransactionCount, "Block transaction count should be 1.");
            assert.equal(1, blockTransactionCount, "Block transaction count should be 1.");
            done();
          });
        });
      });
    });

    it("should return 0 transactions when the block doesn't exist", function(done) {
      web3.eth.getBlockTransactionCount(1000000, function(err, blockTransactionCount) {
        if (err) return done(err);
        assert.equal(0, blockTransactionCount,  "Block transaction count should be 0.");
        done();
      });
    });
  });

  // Dependent upon validity of eth_getBlockTransactionCountByNumber
  describe("eth_getBlockTransactionCountByHash", function(){
    it("should return the number of transactions given the hash", function(done) {
      web3.eth.getBlock(0, true, function(err, blockByNumber) {
        if (err) return done(err);
        web3.eth.getBlockTransactionCount(blockByNumber.number, true, function(err, txCountByHash) {
          if (err) return done(err);
            web3.eth.getBlockTransactionCount(blockByNumber.hash , function(err, txCountByNumber) {
              if (err) return done(err);
              assert.equal(txCountByHash, txCountByNumber, "Txn count for block retrieved by hash should equal count retrieved by number.");
              done();
            });
        });
      });
    });
  });

  describe("eth_sign", function() {
    var accounts;
    var web3;

    // This account produces an edge case signature when it signs the hex-encoded buffer:
    // '0x07091653daf94aafce9acf09e22dbde1ddf77f740f9844ac1f0ab790334f0627'. (See Issue #190)
    var acc = {
      balance: "0X00",
      secretKey: "0xe6d66f02cd45a13982b99a5abf3deab1f67cf7be9fee62f0a072cb70896342e4"
    };

    // Load account.
    before(function( done ){
      web3 = new Web3();
      web3.setProvider(TestRPC.provider({
        accounts: [ acc ]
      }));
      web3.eth.getAccounts(function(err, accs) {
        if (err) return done(err);
        accounts = accs;
        done();
      });
    });

    it("should produce a signature whose signer can be recovered", function(done) {
  	  var msg = utils.toBuffer("asparagus");
      var msgHash = utils.hashPersonalMessage(msg);
  	  web3.eth.sign(accounts[0], utils.bufferToHex(msg), function(err, sgn) {
        if (err) return done(err);

    	  sgn = utils.stripHexPrefix(sgn);
    		var r = new Buffer(sgn.slice(0, 64), 'hex');
    		var s = new Buffer(sgn.slice(64, 128), 'hex');
    		var v = parseInt(sgn.slice(128, 130), 16) + 27;
    		var pub = utils.ecrecover(msgHash, v, r, s);
    		var addr = utils.setLength(utils.fromSigned(utils.pubToAddress(pub)), 20);
    		addr = utils.addHexPrefix(addr.toString('hex'));
    		assert.deepEqual(addr, accounts[0]);
    		done();
	    });
  	});

    it("should work if ecsign produces 'r' or 's' components that start with 0", function(done){
      // This message produces a zero prefixed 'r' component when signed by ecsign
      // w/ the account set in this test's 'before' block.
      var msgHex = '0x07091653daf94aafce9acf09e22dbde1ddf77f740f9844ac1f0ab790334f0627';
      var edgeCaseMsg = utils.toBuffer(msgHex);
      var msgHash = utils.hashPersonalMessage(edgeCaseMsg);
      web3.eth.sign( accounts[0], msgHex, function(err, sgn) {
        if (err) return done(err);

        sgn = utils.stripHexPrefix(sgn);
        var r = new Buffer(sgn.slice(0, 64), 'hex');
        var s = new Buffer(sgn.slice(64, 128), 'hex');
        var v = parseInt(sgn.slice(128, 130), 16) + 27;
        var pub = utils.ecrecover(msgHash, v, r, s);
        var addr = utils.setLength(utils.fromSigned(utils.pubToAddress(pub)), 20);
        addr = utils.addHexPrefix(addr.toString('hex'));
        assert.deepEqual(addr, accounts[0]);
        done();
      });
    })

  });

  describe('eth_sendRawTransaction', () => {

    it("should fail with bad nonce (too low)", function(done) {
      var provider = web3.currentProvider;
      var transaction = new Transaction({
        "value": "0x10000000",
        "gasLimit": "0x33450",
        "from": accounts[0],
        "to": accounts[1],
        "nonce": "0x00",  // too low nonce
      })

      var secretKeyBuffer = Buffer.from(secretKeys[0].substr(2), 'hex')
      transaction.sign(secretKeyBuffer)

      web3.eth.sendRawTransaction(transaction.serialize(), function(err, result) {
        assert(err.message.indexOf("the tx doesn't have the correct nonce. account has nonce of: 1 tx has nonce of: 0") >= 0);
        done()
      })

    })

    it("should fail with bad nonce (too high)", function(done) {
      var provider = web3.currentProvider;
      var transaction = new Transaction({
        "value": "0x10000000",
        "gasLimit": "0x33450",
        "from": accounts[0],
        "to": accounts[1],
        "nonce": "0xff",  // too low nonce
      })

      var secretKeyBuffer = Buffer.from(secretKeys[0].substr(2), 'hex')
      transaction.sign(secretKeyBuffer)

      web3.eth.sendRawTransaction(transaction.serialize(), function(err, result) {
        assert(err.message.indexOf("the tx doesn't have the correct nonce. account has nonce of: 1 tx has nonce of: 255") >= 0);
        done()
      })

    })

    it("should suceed with right nonce (1)", function(done) {
      var provider = web3.currentProvider;
      var transaction = new Transaction({
        "value": "0x10000000",
        "gasLimit": "0x33450",
        "from": accounts[0],
        "to": accounts[1],
        "nonce": "0x01"
      })

      var secretKeyBuffer = Buffer.from(secretKeys[0].substr(2), 'hex')
      transaction.sign(secretKeyBuffer)

      web3.eth.sendRawTransaction(transaction.serialize(), function(err, result) {
        done(err)
      })

    })


  })

  describe("contract scenario", function() {

    // These are expected to be run in order.
    var initialTransaction;
    var contractAddress;

    it("should add a contract to the network (eth_sendTransaction)", function(done) {
      web3.eth.sendTransaction({
        from: accounts[0],
        data: contract.binary,
        gas: 3141592,
        value: 1
      }, function(err, result) {
        if (err) return done(err);

        initialTransaction = result;
        assert.deepEqual(initialTransaction.length, 66);
        done();
      });
    });

    it("should verify the transaction immediately (eth_getTransactionReceipt)", function(done) {
      web3.eth.getTransactionReceipt(initialTransaction, function(err, receipt) {
        if (err) return done(err);

        contractAddress = receipt.contractAddress;

        assert.notEqual(receipt, null, "Transaction receipt shouldn't be null");
        assert.notEqual(contractAddress, null, "Transaction did not create a contract");
        done();
      });
    });

    it("should return null if asked for a receipt for a nonexistent transaction (eth_getTransactionReceipt)", function(done) {
      web3.eth.getTransactionReceipt("0xdeadbeef", function(err, receipt) {
        if (err) return done(err);

        assert.equal(receipt, null, "Transaction receipt should be null");
        done();
      });
    });

    it("should verify the code at the address matches the runtimeBinary (eth_getCode)", function(done) {
      web3.eth.getCode(contractAddress, function(err, result) {
        if (err) return done(err);
        assert.equal(result, contract.runtimeBinary);
        done();
      });
    });

    it("should have balance of 1 (eth_getBalance)", function(done) {
      web3.eth.getBalance(contractAddress, function(err, result) {
        if (err) return done(err);
        assert.equal(result, 1);
        done();
      });
    });

    it("should be able to read data via a call (eth_call)", function(done) {
      var call_data = contract.call_data;
      call_data.to = contractAddress;
      call_data.from = accounts[0];

      var starting_block_number = null;

      // TODO: Removing this callback hell would be nice.
      web3.eth.getBlockNumber(function(err, result) {
        if (err) return done(err);

        starting_block_number = result;

        web3.eth.call(call_data, function(err, result) {
          if (err) return done(err);
          assert.equal(web3.toDecimal(result), 5);

          web3.eth.getBlockNumber(function(err, result) {
            if (err) return done(err);

            assert.equal(result, starting_block_number, "eth_call increased block count when it shouldn't have");
            done();
          });
        });
      });
    });

    it("should get back a runtime error on a bad call (eth_call)", function(done) {
      var call_data = clone(contract.call_data);
      call_data.to = contractAddress;
      call_data.from = accounts[0];

      // TODO: Removing this callback hell would be nice.
      web3.eth.estimateGas(call_data, function (err, result) {
        if (err) return done(err);
        // set a low gas limit to force a runtime error
        call_data.gas = result - 1;

        web3.eth.call(call_data, function (err, result) {
          // should have received an error
          assert(err, "did not return runtime error");
          assert.equal(err.message, "VM Exception while processing transaction: out of gas", "did not receive an 'out of gas' error.")
          done();
        });
      });
    });

    it("should be able to make a call from an address not in the accounts list (eth_call)", function(done) {
      var from = "0x1234567890123456789012345678901234567890";

      // Assert precondition: Ensure from address isn't in the accounts list.
      accounts.forEach(function(account) {
        assert.notEqual(from, account, "Test preconditions not met: from address must not be within the accounts list, please rerun");
      });

      var call_data = contract.call_data;
      call_data.to = contractAddress;
      call_data.from = from;

      web3.eth.call(call_data, function(err, result) {
        if (err) return done(err);
        assert.equal(web3.toDecimal(result), 5);

        done();
      });
    });

    it("should be able to make a call when no address is listed (eth_call)", function(done) {
      var call_data = contract.call_data;
      call_data.to = contractAddress;
      delete call_data.from;

      web3.eth.call(call_data, function(err, result) {
        if (err) return done(err);
        assert.equal(web3.toDecimal(result), 5);

        done();
      });
    });

    it("should represent the block number correctly in the Oracle contract (oracle.blockhash0)", function(done){
      var oracleSol = fs.readFileSync("./test/Oracle.sol", {encoding: "utf8"});
      var oracleOutput = solc.compile(oracleSol).contracts[":Oracle"]
      web3.eth.contract(JSON.parse(oracleOutput.interface)).new({ data: oracleOutput.bytecode, from: accounts[0], gas: 3141592 }, function(err, oracle){
        if(err) return done(err)
        if(!oracle.address) return
        web3.eth.getBlock(0, true, function(err, block){
          if (err) return done(err)
          oracle.blockhash0(function(err, blockhash){
            if (err) return done(err)
            assert.equal(blockhash, block.hash);
            done()
          })
        })
      })
    })

    it("should be able to estimate gas of a transaction (eth_estimateGas)", function(done){
      var tx_data = contract.transaction_data;
      tx_data.to = contractAddress;
      tx_data.from = accounts[0];

      var starting_block_number = null;

      // TODO: Removing this callback hell would be nice.
      web3.eth.getBlockNumber(function(err, result) {
        if (err) return done(err);

        starting_block_number = result;

        web3.eth.estimateGas(tx_data, function(err, result) {
          if (err) return done(err);
          assert.equal(result, 27682);

          web3.eth.getBlockNumber(function(err, result) {
            if (err) return done(err);

            assert.equal(result, starting_block_number, "eth_estimateGas increased block count when it shouldn't have");
            done();
          });
        });
      });
    });

    it("should be able to estimate gas from an account not within the accounts list (eth_estimateGas)", function(done){
      var tx_data = contract.transaction_data;
      tx_data.to = contractAddress;
      tx_data.from = "0x1234567890123456789012345678901234567890";;

      var starting_block_number = null;

      web3.eth.estimateGas(tx_data, function(err, result) {
        if (err) return done(err);
        assert.equal(result, 27682);
        done();
      });
    });

    it("should be able to estimate gas when no account is listed (eth_estimateGas)", function(done){
      var tx_data = contract.transaction_data;
      tx_data.to = contractAddress;
      delete tx_data.from;

      var starting_block_number = null;

      web3.eth.estimateGas(tx_data, function(err, result) {
        if (err) return done(err);
        assert.equal(result, 27682);
        done();
      });
    });

    it("should be able to send a state changing transaction (eth_sendTransaction)", function(done) {
      var tx_data = contract.transaction_data;
      tx_data.to = contractAddress;
      tx_data.from = accounts[0];

      var call_data = contract.call_data;
      call_data.from = accounts[0];
      call_data.to = contractAddress;

      web3.eth.sendTransaction(tx_data, function(err, tx) {
        if (err) return done(err);
        // Now double check the data was set properly.
        // NOTE: Because ethereumjs-testrpc processes transactions immediately,
        // we can do this. Calling the call immediately after the transaction would
        // fail on a different Ethereum client.

        web3.eth.getTransactionReceipt(tx, function(err, receipt) {
          if (err) return done(err);

          assert.equal(receipt.logs.length, 1, "Receipt had wrong amount of logs");
          assert.equal(receipt.logs[0].blockHash, receipt.blockHash, "Logs blockhash doesn't match block blockhash");

          //console.log(call_data);
          web3.eth.call(call_data, function(err, result) {
            if (err) return done(err);

            assert.equal(web3.toDecimal(result), 25);
            done();
          });
        });
      });
    });

    it("should only be able to send an unsigned state changing transaction from an address within the accounts list (eth_sendTransaction)", function(done) {
      var badAddress = "0x1234567890123456789012345678901234567890";

      var tx_data = {};
      tx_data.to = "0x1111111111000000000011111111110000000000";
      tx_data.from = badAddress;
      tx_data.value = "0x1";

      web3.eth.sendTransaction(tx_data, function(err, result) {
        if (err) {
          assert.notEqual(err.message.indexOf("could not unlock signer account"), -1);
          done();
        } else {
          assert.fail("Should have received an error")
        }
      });
    });

    it("should get the data from storage (eth_getStorageAt) with padded hex", function(done) {
      web3.eth.getStorageAt(contractAddress, contract.position_of_value, function(err, result) {
        assert.equal(web3.toDecimal(result), 25);
        done();
      });
    });

    it("should get the data from storage (eth_getStorageAt) with unpadded hex", function(done) {
      web3.eth.getStorageAt(contractAddress, '0x0', function(err, result) {
        assert.equal(web3.toDecimal(result), 25);
        done();
      });
    });

    it("should get the data from storage (eth_getStorageAt) with number", function(done) {
      web3.eth.getStorageAt(contractAddress, 0, function(err, result) {
        assert.equal(web3.toDecimal(result), 25);
        done();
      });
    });

  });

  describe("contract scenario (raw tx)", function() {

    var tx = new Transaction({
      data: contract.binary,
      gasLimit: to.hex(3141592)
    })
    var privateKey = new Buffer('e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109', 'hex')
    var senderAddress = '0x'+utils.privateToAddress(privateKey).toString('hex')
    tx.sign(privateKey)
    var rawTx = '0x'+tx.serialize().toString('hex')

    // These are expected to be run in order.
    var initialTransaction;
    var blockHash;
    var blockNumber;
    var contractAddress;

    it("should first populate senders address", function(done) {
      // populate senders balance
      web3.eth.sendTransaction({
        from: accounts[0],
        to: senderAddress,
        value: '0x3141592',
        gas: 3141592
      }, function(err, result) {
        if (err) return done(err);
        done();
      });
    });

    it("should add a contract to the network (eth_sendRawTransaction)", function(done) {
      web3.eth.sendRawTransaction(rawTx, function(err, result) {
        if (err) return done(err);
        initialTransaction = result;
        done();
      });
    });

    it("should verify the transaction immediately (eth_getTransactionReceipt)", function(done) {
      web3.eth.getTransactionReceipt(initialTransaction, function(err, receipt) {
        if (err) return done(err);

        contractAddress = receipt.contractAddress;
        blockHash = receipt.blockHash;
        blockNumber = receipt.blockNumber;

        assert.notEqual(receipt, null, "Transaction receipt shouldn't be null");
        assert.notEqual(contractAddress, null, "Transaction did not create a contract");
        done();
      });
    });

    it("should verify the transaction immediately (eth_getTransactionByHash)", function(done) {
      web3.eth.getTransaction(initialTransaction, function(err, result) {
        if (err) return done(err);

        assert.notEqual(result, null, "Transaction result shouldn't be null");
        assert.equal(result.hash, initialTransaction, "Resultant hash isn't what we expected")

        done();
      });
    });

    it("should return null if transaction doesn't exist (eth_getTransactionByHash)", function(done) {
      web3.eth.getTransaction("0x401b8ebb563ec9425b052aba8896cb74e07635563111b5a0663289d1baa8eb12", function(err, result) {
        if (err) return done(err);

        assert.equal(result, null, "Receipt should be null");

        done();
      });
    });

    it("should verify there's code at the address (eth_getCode)", function(done) {
      web3.eth.getCode(contractAddress, function(err, result) {
        if (err) return done(err);
        assert.notEqual(result, null);
        assert.notEqual(result, "0x");

        // NOTE: We can't test the code returned is correct because the results
        // of getCode() are *supposed* to be different than the code that was
        // added to the chain.

        done();
      });
    });

    it("should be able to get the transaction from the block (eth_getTransactionByBlockHashAndIndex)", function(done) {
      web3.eth.getTransactionFromBlock(blockHash, 0, function(err, result) {
        if (err) return done(err);

        assert.equal(result.hash, initialTransaction);
        assert.equal(result.blockNumber, blockNumber);
        assert.equal(result.blockHash, blockHash);
        done();
      });
    });

    it("should return null if block doesn't exist (eth_getTransactionByBlockHashAndIndex)", function(done) {
      var badBlockHash = "0xaaaaaaeb03ec5e3c000d150df2c9e7ffc31e728d12aaaedc5f6cccaca5aaaaaa";
      web3.eth.getTransactionFromBlock(badBlockHash, 0, function(err, result) {
        if (err) return done(err);

        assert.equal(result, null);

        done();
      });
    });

    it("should be able to get the transaction from the block (eth_getTransactionByBlockNumberAndIndex)", function(done) {
      web3.eth.getTransactionFromBlock(blockNumber, 0, function(err, result) {
        if (err) return done(err);

        assert.equal(result.hash, initialTransaction);
        assert.equal(result.blockNumber, blockNumber);
        assert.equal(result.blockHash, blockHash);
        done();
      });
    });

    it("should throw error for transactions that don't exist in block (eth_getTransactionByBlockNumberAndIndex)", function(done) {
      web3.eth.getTransactionFromBlock(blockNumber, 3, function(err, result) {
        // We want an error because there is no transaction with id 3.
        if (err) return done();

        done(new Error("We didn't receive an error like we expected"));
      });
    });
  });

  describe("eth_getTransactionCount", function() {
    //it("should return number of transactions sent from an address"); //, function() {

    it("should return 0 for non-existent account", function(done) {
      web3.eth.getTransactionCount("0x1234567890123456789012345678901234567890", function(err, result) {
        if (err) return done(err);

        assert.equal(result, "0x0");
        done();
      });
    });
  });

  describe("eth_compileSolidity (not supported)", function() {
    this.timeout(5000);
    it("correctly compiles solidity code", function(done) {
      web3.eth.compile.solidity(source, function(err, result) {
        assert(err != null)
        assert(err.message.indexOf("Method eth_compileSolidity not supported") >= 0);
        done();
      });
    });
  });

  describe("miner_stop", function(){
    it("should stop mining", function(done){
      web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "miner_stop",
      }, function(err,result){
        var tx_data = {}
        tx_data.to = accounts[1];
        tx_data.from = accounts[0];
        tx_data.value = 0x1;

        web3.eth.sendTransaction(tx_data, function(err, tx) {
          if (err) return done(err);

          web3.eth.getTransactionReceipt(tx, function(err, receipt) {
            if (err) return done(err);

            assert.equal(receipt, null);
            web3.currentProvider.sendAsync({
              jsonrpc: "2.0",
              method: "miner_start",
              params: [1]
            }, function(err, result){
              if (err) return done(err);
              done();
            })
          });
        });
      })
    })
  });

  describe("miner_start", function(){
    it("should start mining", function(done){
      web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "miner_stop",
      }, function(err,result){
        web3.currentProvider.sendAsync({
          jsonrpc: "2.0",
          method: "miner_start",
          params: [1]
        }, function(err,result){
          var tx_data = {}
          tx_data.to = accounts[1];
          tx_data.from = accounts[0];
          tx_data.value = 0x1;

          web3.eth.sendTransaction(tx_data, function(err, tx) {
            if (err) return done(err);
            //Check the receipt
            web3.eth.getTransactionReceipt(tx, function(err, receipt) {
              if (err) return done(err);
              assert.notEqual(receipt, null); //i.e. receipt exists, so transaction was mined
              done();
            });
          });
        })
      })
    })
  });

  describe("web3_sha3", function() {
    it("should hash the given input", function(done) {
      var input = "Tim is a swell guy.";

      // web3.sha3() doesn't actually call the function, so we need to call it ourselves.
      web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "web3_sha3",
        params: [input],
        id: new Date().getTime()
      }, function(err, result) {
        if (err) return done(err);
        if (result.error) return done(result.error);

        assert.equal(result.result, web3.sha3(input));
        done();
      })
    });
  });

  describe("net_version", function() {
    it("should return a version very close to the current time", function(done) {
      web3.version.getNetwork(function(err, result) {
        if (err) return done(err);

        assert.equal(result.length, (new Date().getTime() + "").length, "net_version result doesn't appear to be similar in length the current time as an integer")
        done();
      });
    });
  });

  describe("personal_newAccount", function() {
    it("should return the new address", function(done) {
      web3.personal.newAccount("password", function(err, result) {
        if (err) return done(err);
        assert.notEqual(result.match("0x[0-9a-f]{39}"), null, "Invalid address received");
        done();
      });
    });
  });

  describe("personal_listAccounts", function() {
    it("should return more than 0 accounts", function(done) {
      web3.personal.getListAccounts(function(err, result) {
        if (err) return done(err);
        assert.equal(result.length, 2);
        done();
      });
    });
  });

  describe("personal_unlockAccount", function() {
    it("should unlock account", function(done) {
      web3.personal.unlockAccount(personalAccount, "password", function(err, result) {
        if (err) return done(err);
        assert.equal(result, true);
        done();
      });
    });
  });

  describe("personal_lockAccount", function() {
    it("should lock account", function(done) {
      web3.personal.lockAccount(personalAccount, function(err, result) {
        if (err) return done(err);
        assert.equal(result, true);
        done();
      });
    });
  });

  describe("personal_sendTransaction", function() {
    it("should send transaction", function(done) {
      web3.personal.sendTransaction({
        from: personalAccount,
        to: personalAccount,
        value: 1
      }, "password", function(err, result) {
        // NOTE: this is an Error class thrown by the state
        assert.notEqual(err.message.match("sender doesn't have enough funds to send tx."), null);
        done();
      });
    });
  });
};

var logger = {
  log: function(message) {
    //console.log(message);
  }
};

describe("Provider:", function() {
  var web3 = new Web3();
  web3.setProvider(TestRPC.provider({
    logger: logger,
    seed: "1337"
  }));
  tests(web3);
});

describe("Server:", function(done) {
  var web3 = new Web3();
  var port = 12345;
  var server;

  before("Initialize TestRPC server", function(done) {
    server = TestRPC.server({
      logger: logger,
      seed: "1337"
    });
    server.listen(port, function(err) {
      web3.setProvider(new Web3.providers.HttpProvider("http://localhost:" + port));
      done();
    });
  });

  after("Shutdown server", function(done) {
    server.close(done);
  });

  tests(web3);
});
