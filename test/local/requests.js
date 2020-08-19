const Web3 = require("web3");
const BN = Web3.utils.BN;
const Web3WsProvider = require("web3-providers-ws");
const Transaction = require("../../lib/utils/transaction");
const BlockHeader = require("ethereumjs-block/header");
const utils = require("ethereumjs-util");
const assert = require("assert");
const Ganache = require(process.env.TEST_BUILD
  ? "../../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../../index.js");
const to = require("../../lib/utils/to");
const _ = require("lodash");
const pify = require("pify");
const generateSend = require("../helpers/utils/rpc");
const compile = require("../helpers/contract/singleFileCompile");
const hasOwnProperty = Object.prototype.hasOwnProperty;

const { result: compilationResult, source } = compile("./test/contracts/examples/", "Example");

const secretKeys = [
  "0xda09f8cdec20b7c8334ce05b27e6797bef01c1ad79c59381666467552c5012e3",
  "0x0d14f32c8e3ed7417fb7db52ebab63572bf7cfcd557351d4ccf19a05edeecfa5",
  "0x0d80aca78bfaf3ab47865a53e5977e285c41c028a15313f917fe78abe5a50ef7",
  "0x00af8067d4c69abca7234194f154d7f31e13c0e53dae9260432f1bcc6d1d13fb",
  "0x8939a6a37b48c47f9bc683c371dd96e819d65f6138f3b376a622ecb40379bd22",
  "0x4a3665bf95efd38cb9820ce129a26fee03927f17930924c98908c8885ca53606",
  "0x111bd4b380f2eeb0d00b025d574908d59c1bfa0030d7a69f69445c171d8cfa27",
  "0x6aff34e843c3a99fe21dcc014e3b5bf6a160a4bb8c4c470ea79acd33d9bea41f",
  "0x12ae0eb585babc60c88a74190a6074488a0d2f296124ce37f85dbec1d693906f",
  "0xd46dc75904628a0b0eaffdda6acbe2687924299995708e30d05a1e8a2a1c5d45"
];

// Note: Certain properties of the following contract data are hardcoded to
// maintain repeatable tests. If you significantly change the solidity code,
// make sure to update the resulting contract data with the correct values.
const example = compilationResult.contracts["Example.sol"].Example;
const contract = {
  solidity: source,
  abi: example.abi,
  binary: "0x" + example.evm.bytecode.object,
  runtimeBinary: "0x" + example.evm.deployedBytecode.object,
  position_of_value: "0x0000000000000000000000000000000000000000000000000000000000000000",
  expected_default_value: 5,
  callData: {
    gasPrice: "0x01", // This is important, as passing it has exposed errors in the past.
    to: null, // set by test
    data: "0x3fa4f245"
  },
  transaction_data: {
    from: null, // set by test
    to: null, // set by test
    data: "0x552410770000000000000000000000000000000000000000000000000000000000000019", // sets value to 25 (base 10)
    gas: 3141592
  }
};

const tests = function(web3) {
  let accounts;
  let personalAccount;
  let send;

  before("create and fund personal account", async function() {
    send = generateSend(web3.currentProvider);
    accounts = await web3.eth.getAccounts();
    accounts = accounts.map(function(val) {
      return val.toLowerCase();
    });

    personalAccount = await web3.eth.personal.newAccount("password");
  });

  describe("eth_accounts", function() {
    it("should return 10 addresses", function() {
      assert.deepStrictEqual(accounts.length, 10);
    });
  });

  describe("eth_getCompilers", function() {
    it("should return an empty array", async function() {
      const compilers = (await send("eth_getCompilers")).result;
      assert(Array.isArray(compilers));
      assert.strictEqual(0, compilers.length);
    });
  });

  describe("eth_blockNumber", function() {
    it("should return initial block number of zero", async function() {
      const result = await web3.eth.getBlockNumber();
      assert.deepStrictEqual(result, 0);
    });
  });

  describe("eth_chainId", function() {
    it("should return a default chain id", async function() {
      const send = pify(web3._provider.send.bind(web3._provider));

      const result = await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: []
      });

      // For legacy reasons, we return 1337 regardless of the actual chain id
      // next major release this will be fixed.
      assert.strictEqual(result.result, "0x539");
    });
  });

  describe("eth_coinbase", function() {
    it("should return correct address", async function() {
      const coinbase = await web3.eth.getCoinbase();
      assert.strictEqual(coinbase, accounts[0]);
    });
  });

  describe("eth_mining", function() {
    it("should return true", async function() {
      const result = await web3.eth.isMining();
      assert.deepStrictEqual(result, true);
    });
  });

  describe("eth_hashrate", function() {
    it("should return hashrate of zero", async function() {
      const result = await web3.eth.getHashrate();
      assert.deepStrictEqual(result, 0);
    });
  });

  describe("eth_gasPrice", function() {
    it("should return gas price of 2 gwei", async function() {
      const result = await web3.eth.getGasPrice();
      assert.strictEqual(to.hexWithZeroPadding(result), to.hexWithZeroPadding(2000000000));
    });
  });

  describe("eth_getBalance", function() {
    it("should return initial balance", async function() {
      const result = await web3.eth.getBalance(accounts[0]);
      assert.deepStrictEqual(result, "100000000000000000000");
    });

    it("should return 0 for non-existent account", async function() {
      const result = await web3.eth.getBalance("0x1234567890123456789012345678901234567890");
      assert.strictEqual("0x" + result.toString(16), "0x0");
    });
  });

  describe("eth_getBlockByNumber", function() {
    it("should return block given the block number", async function() {
      const block = await web3.eth.getBlock(0, true);

      const expectedFirstBlock = {
        number: 0,
        hash: block.hash, // Don't test this one
        mixHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        nonce: "0x0000000000000000",
        sha3Uncles: "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
        logsBloom:
          "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000" +
          "000000000000000000000000000000000000000000000000000000000000000000000000000000000" +
          "000000000000000000000000000000000000000000000000000000000000000000000000000000000" +
          "000000000000000000000000000000000000000000000000000000000000000000000000000000000" +
          "000000000000000000000000000000000000000000000000000000000000000000000000000000000" +
          "000000000000000000000000000000000000000000000000000000000000000000000000000000000" +
          "0000000000000000000000000000",
        transactionsRoot: "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
        stateRoot: "0xe15198e397d86e678a5ad5830cbb813915f502384455f10f5004a0d35d6d27d6",
        receiptsRoot: "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
        miner: "0x0000000000000000000000000000000000000000",
        difficulty: "0",
        totalDifficulty: "0",
        extraData: "0x",
        size: 1000,
        gasLimit: 6721975,
        gasUsed: 0,
        timestamp: block.timestamp, // Don't test this one.
        transactions: [],
        uncles: []
      };

      assert.deepStrictEqual(block, expectedFirstBlock);

      const now = new Date().getTime();
      const then = block.timestamp * 1000; // block.timestamp is in seconds.

      assert.strictEqual(then.toString().length, now.toString().length, "Invalid timestamp length");
      assert(then < now, "Time returned was greater than the current time");
    });

    it("should return null given a future block number", async function() {
      const block = await web3.eth.getBlock(10000, true);
      assert.deepStrictEqual(block, null);
    });

    it("should return transactions in the block as well", async function() {
      const receipt = await web3.eth.sendTransaction({
        from: accounts[0],
        data: contract.binary,
        gas: 3141592
      });

      const txHash = receipt.transactionHash;

      // Assume it was processed correctly.
      assert.deepStrictEqual(txHash.length, 66);

      let block = await web3.eth.getBlock("latest", true);

      assert.strictEqual(block.transactions.length, 1, "Latest block should have one transaction");
      assert.strictEqual(block.transactions[0].hash, txHash, "Transaction hashes don't match");

      // Retest, with transaction only as hash
      block = await web3.eth.getBlock("latest", false);

      assert.strictEqual(block.transactions.length, 1, "Latest block should have one transaction");
      assert.strictEqual(block.transactions[0], txHash, "Transaction hashes don't match");
    });

    it("should return correct block hash", async function() {
      const block = await web3.eth.getBlock("latest", true);
      const header = new BlockHeader({
        parentHash: block.parentHash,
        uncleHash: block.sha3Uncles,
        coinbase: block.miner,
        stateRoot: block.stateRoot,
        transactionsTrie: block.transactionsRoot,
        receiptTrie: block.receiptsRoot,
        bloom: block.logsBloom,
        difficulty: parseInt(block.difficulty, 10),
        number: block.number,
        gasLimit: block.gasLimit,
        gasUsed: block.gasUsed,
        timestamp: block.timestamp,
        extraData: block.extraData,
        mixHash: block.mixHash,
        nonce: block.nonce
      });
      assert.strictEqual(block.hash, "0x" + header.hash().toString("hex"), "Block hash matches computed hash");
    });
  });

  // Relies on the validity of eth_getBlockByNumber above.
  describe("eth_getBlockByHash", function() {
    it("should return block given the block hash", async function() {
      const blockByNumber = await web3.eth.getBlock(0, true);
      const blockByHash = await web3.eth.getBlock(blockByNumber.hash, true);
      assert.deepStrictEqual(blockByHash, blockByNumber);
    });
  });

  describe("eth_getBlockTransactionCountByNumber", function() {
    it("should return the number of transactions given the block number (0 transactions)", async function() {
      // Block 0 should have 0 transactions as per test eth_getBlockByNumber
      const block = await web3.eth.getBlock(0, true);
      const blockTransactionCount = await send("eth_getBlockTransactionCountByNumber", 0);
      assert.strictEqual(
        block.transactions.length,
        parseInt(blockTransactionCount.result),
        "Block transaction count should be 0."
      );
      assert.strictEqual(blockTransactionCount.result, "0x0", "Block transaction count should be 0.");
    });

    it("should return the number of transactions given the block number (1 transaction)", async function() {
      // Create a transaction and check
      // Account 0 seems to be running out of gas before all tests are complete
      const payingAccount = 2;

      const receipt = await web3.eth.sendTransaction({
        from: accounts[payingAccount],
        data: contract.binary,
        gas: 3141592
      });

      const txHash = receipt.transactionHash;

      // Assume it was processed correctly.
      assert.deepStrictEqual(txHash.length, 66);

      const block = await web3.eth.getBlock("latest", true);
      const blockTransactionCount = await send("eth_getBlockTransactionCountByNumber", block.number);
      assert.strictEqual(
        block.transactions.length,
        parseInt(blockTransactionCount.result),
        "Tx count should equal block tx's length."
      );
      assert.strictEqual(blockTransactionCount.result, "0x1", "Block transaction count should be 1.");
    });

    it("should return null transactions when the block doesn't exist", async function() {
      const blockTransactionCount = await send("eth_getBlockTransactionCountByNumber", 1000000);
      assert.strictEqual(blockTransactionCount.result, null, "Block transaction count should be null.");
    });
  });

  // Dependent upon validity of eth_getBlockTransactionCountByNumber
  describe("eth_getBlockTransactionCountByHash", function() {
    it("should return the number of transactions given the hash", async function() {
      const blockByNumber = await web3.eth.getBlock(0, true);
      const txCountByHash = await web3.eth.getBlockTransactionCount(blockByNumber.number, true);
      const txCountByNumber = await web3.eth.getBlockTransactionCount(blockByNumber.hash);
      assert.strictEqual(
        txCountByHash,
        txCountByNumber,
        "Txn count for block retrieved by hash should equal count retrieved by number."
      );
    });
  });

  describe("eth_getCode", function() {
    it("should return 0x for eth_getCode called on a non-contract", async function() {
      const code = await web3.eth.getCode("0x000000000000000000000000000000000000dEaD");
      assert.strictEqual(code, "0x");
    });
  });

  describe("eth_sign", function() {
    let accounts;
    let signingWeb3;

    // This account produces an edge case signature when it signs the hex-encoded buffer:
    // '0x07091653daf94aafce9acf09e22dbde1ddf77f740f9844ac1f0ab790334f0627'. (See Issue #190)
    const acc = {
      balance: "0x0",
      secretKey: "0xe6d66f02cd45a13982b99a5abf3deab1f67cf7be9fee62f0a072cb70896342e4"
    };

    // Load account.
    before(async function() {
      signingWeb3 = new Web3();
      signingWeb3.setProvider(
        Ganache.provider({
          accounts: [acc]
        })
      );
      accounts = await signingWeb3.eth.getAccounts();
      accounts = accounts.map(function(val) {
        return val.toLowerCase();
      });
    });

    it("should produce a signature whose signer can be recovered", async function() {
      const msg = utils.toBuffer("0xffffffffff");
      const msgHash = utils.hashPersonalMessage(msg);

      let sgn = await signingWeb3.eth.sign(utils.bufferToHex(msg), accounts[0]);
      sgn = utils.stripHexPrefix(sgn);

      const r = Buffer.from(sgn.slice(0, 64), "hex");
      const s = Buffer.from(sgn.slice(64, 128), "hex");
      const v = parseInt(sgn.slice(128, 130), 16) + 27;
      const pub = utils.ecrecover(msgHash, v, r, s);
      let addr = utils.setLength(utils.fromSigned(utils.pubToAddress(pub)), 20);
      addr = to.hex(addr);
      assert.deepStrictEqual(addr, accounts[0]);
    });

    it("should work if ecsign produces 'r' or 's' components that start with 0", async function() {
      // This message produces a zero prefixed 'r' component when signed by ecsign
      // w/ the account set in this test's 'before' block.
      const msgHex = "0x07091653daf94aafce9acf09e22dbde1ddf77f740f9844ac1f0ab790334f0627";
      const edgeCaseMsg = utils.toBuffer(msgHex);
      const msgHash = utils.hashPersonalMessage(edgeCaseMsg);

      let sgn = await signingWeb3.eth.sign(msgHex, accounts[0]);
      sgn = utils.stripHexPrefix(sgn);

      const r = Buffer.from(sgn.slice(0, 64), "hex");
      const s = Buffer.from(sgn.slice(64, 128), "hex");
      const v = parseInt(sgn.slice(128, 130), 16) + 27;
      const pub = utils.ecrecover(msgHash, v, r, s);
      let addr = utils.setLength(utils.fromSigned(utils.pubToAddress(pub)), 20);
      addr = to.hex(addr);
      assert.deepStrictEqual(addr, accounts[0]);
    });

    after("shutdown", async function() {
      const provider = signingWeb3._provider;
      signingWeb3.setProvider();
      await pify(provider.close)();
    });
  });

  describe("eth_signTypedData", function() {
    let accounts;
    let signingWeb3;

    // Account based on https://github.com/ethereum/EIPs/blob/master/assets/eip-712/Example.js
    const acc = {
      balance: "0x0",
      secretKey: web3.utils.sha3("cow")
    };

    // Load account.
    before(async function() {
      signingWeb3 = new Web3();
      signingWeb3.setProvider(
        Ganache.provider({
          accounts: [acc]
        })
      );
      accounts = await signingWeb3.eth.getAccounts();
      accounts = accounts.map(function(val) {
        return val.toLowerCase();
      });
    });

    it("should produce a signature whose signer can be recovered", async function() {
      const typedData = {
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" }
          ],
          Person: [
            { name: "name", type: "string" },
            { name: "wallet", type: "address" }
          ],
          Mail: [
            { name: "from", type: "Person" },
            { name: "to", type: "Person" },
            { name: "contents", type: "string" }
          ]
        },
        primaryType: "Mail",
        domain: {
          name: "Ether Mail",
          version: "1",
          chainId: 1,
          verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
        },
        message: {
          from: { name: "Cow", wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826" },
          to: { name: "Bob", wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB" },
          contents: "Hello, Bob!"
        }
      };

      const response = await pify(signingWeb3.currentProvider.send)({
        jsonrpc: "2.0",
        method: "eth_signTypedData",
        params: [accounts[0], typedData],
        id: new Date().getTime()
      });
      assert.strictEqual(
        response.result,
        "0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d" +
          "07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b915621c"
      );
    });

    it("should produce a signature whose signer can be recovered (for arrays)", async function() {
      const typedData = {
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" }
          ],
          Person: [
            { name: "name", type: "string" },
            { name: "wallets", type: "address[]" }
          ],
          Mail: [
            { name: "from", type: "Person" },
            { name: "to", type: "Person[]" },
            { name: "contents", type: "string" }
          ],
          Group: [
            { name: "name", type: "string" },
            { name: "members", type: "Person[]" }
          ]
        },
        domain: {
          name: "Ether Mail",
          version: "1",
          chainId: 1,
          verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
        },
        primaryType: "Mail",
        message: {
          from: {
            name: "Cow",
            wallets: ["0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826", "0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF"]
          },
          to: [
            {
              name: "Bob",
              wallets: [
                "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
                "0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57",
                "0xB0B0b0b0b0b0B000000000000000000000000000"
              ]
            }
          ],
          contents: "Hello, Bob!"
        }
      };

      const response = await pify(signingWeb3.currentProvider.send)({
        jsonrpc: "2.0",
        method: "eth_signTypedData",
        params: [accounts[0], typedData],
        id: new Date().getTime()
      });
      assert.strictEqual(
        response.result,
        "0x65cbd956f2fae28a601bebc9b906cea0191744bd4c4247bcd27cd08f8eb6b71c" +
          "78efdf7a31dc9abee78f492292721f362d296cf86b4538e07b51303b67f749061b"
      );
    });

    after("shutdown", async function() {
      const provider = signingWeb3._provider;
      signingWeb3.setProvider();
      await pify(provider.close)();
    });
  });

  describe("eth_sendTransaction", function() {
    it("should fail with bad nonce (too low)", async function() {
      const transaction = {
        value: "0x10000000",
        gasLimit: "0x33450",
        from: accounts[0],
        to: accounts[1],
        nonce: "0x0" // too low nonce
      };

      try {
        await web3.eth.sendTransaction(transaction);
        assert.fail("sendTransaction promiEvent should reject");
      } catch (err) {
        const msg = "the tx doesn't have the correct nonce. account has nonce of: 1 tx has nonce of: 0";
        const correctFailureMessage = err.message.indexOf(msg) !== -1;
        assert(correctFailureMessage, `Incorrect error message: ${err.message}`);
      }
    });

    it("should fail with bad nonce (too high)", async function() {
      const transaction = {
        value: "0x10000000",
        gasLimit: "0x33450",
        from: accounts[0],
        to: accounts[1],
        nonce: "0xff" // too high nonce
      };

      try {
        await web3.eth.sendTransaction(transaction);
        assert.fail("sendTransaction promiEvent should reject");
      } catch (e) {
        assert(
          e.message.indexOf("the tx doesn't have the correct nonce. account has nonce of: 1 tx has nonce of: 255") >= 0
        );
      }
    });

    it("should succeed with right nonce (1)", async function() {
      const transaction = {
        value: "0x10000000",
        gasLimit: "0x33450",
        from: accounts[0],
        to: accounts[1],
        nonce: "0x01"
      };

      await web3.eth.sendTransaction(transaction);
    });

    it("should not produce colliding transaction hashes", async function() {
      const tx1 = await web3.eth.sendTransaction({ from: accounts[3], to: accounts[5], value: 2000 });
      const tx2 = await web3.eth.sendTransaction({ from: accounts[4], to: accounts[5], value: 2000 });
      const tx3 = await web3.eth.sendTransaction({ from: accounts[4], to: accounts[5], value: 2000 });
      assert.notDeepStrictEqual(
        tx1.transactionHash,
        tx2.transactionHash,
        "Tx1 and Tx2 should not produce hash collisions (different sender)"
      );
      assert.notDeepStrictEqual(
        tx3.transactionHash,
        tx2.transactionHash,
        "Tx3 and Tx2 should not produce hash collisions (same sender)"
      );
    });

    it("should fail with bad nonce (skipped value)", async function() {
      const nonce = await web3.eth.getTransactionCount(accounts[0]);
      const transaction = {
        value: "0x10000000",
        gasLimit: "0x33450",
        from: accounts[0],
        to: accounts[1],
        nonce: to.rpcQuantityHexString(nonce + 1) // Skipped nonce
      };

      try {
        await web3.eth.sendTransaction(transaction);
        assert.fail("sendTransaction promiEvent should reject");
      } catch (err) {
        assert.notDeepStrictEqual(err, null, "Incorrect nonce, tx should fail.");
      }
    });

    it("should allow a tx to contain data when sent to an external (personal) address", async function() {
      const transaction = {
        value: "0x10000000",
        gasLimit: "0x33450",
        from: accounts[9],
        to: accounts[8],
        data: "0xd46e8dd67c5d32be8d46e8dd67c5d32be8058bb8eb970870f072445675058bb8eb970870f072445675"
      };

      const result = await web3.eth.sendTransaction(transaction);
      assert.notDeepStrictEqual(result, null, "Tx should be successful.");
    });

    it("should succeed with a gasPrice of 0", async function() {
      const transaction = {
        value: "0x1",
        gasLimit: "0x5208",
        gasPrice: "0x0",
        from: accounts[5],
        to: accounts[1]
      };

      // the account balance should be 1 wei less then when the test started
      // gas should have been free
      const balanceStart = new BN(await web3.eth.getBalance(accounts[5]));
      await web3.eth.sendTransaction(transaction);
      const balanceEnd = new BN(await web3.eth.getBalance(accounts[5]));
      assert(balanceStart.sub(new BN(1)).eq(balanceEnd));
    });
  });

  describe("eth_getTransactionReceipt", function() {
    it("should return to and from address fields in the receipt", async function() {
      const transaction = {
        from: accounts[9],
        to: accounts[8]
      };

      const result = await web3.eth.sendTransaction(transaction);

      assert.notStrictEqual(typeof result.from, "undefined");
      assert.notStrictEqual(typeof result.to, "undefined");
      assert.strictEqual(result.from, accounts[9]);
      assert.strictEqual(result.to, accounts[8]);
    });
  });

  describe("eth_sendRawTransaction", function() {
    it("should fail with bad nonce (too low)", async function() {
      const transaction = new Transaction({
        value: "0x10000000",
        gasLimit: "0x33450",
        from: accounts[0],
        to: accounts[1],
        nonce: "0x0" // too low nonce
      });

      const secretKeyBuffer = Buffer.from(secretKeys[0].substr(2), "hex");
      transaction.sign(secretKeyBuffer);

      try {
        const tx = transaction.serialize();

        await web3.eth.sendSignedTransaction(tx);
        assert.fail("sendSignedTransaction promiEvent should reject");
      } catch (err) {
        const msg = "the tx doesn't have the correct nonce. account has nonce of: 2 tx has nonce of: 0";
        assert(err.message.indexOf(msg) >= 0, `Incorrect error message: ${err.message}`);
      }
    });

    it("should fail with bad nonce (too high)", async function() {
      const transaction = new Transaction({
        value: "0x10000000",
        gasLimit: "0x33450",
        from: accounts[0],
        to: accounts[1],
        nonce: "0xff" // too high nonce
      });

      const secretKeyBuffer = Buffer.from(secretKeys[0].substr(2), "hex");
      transaction.sign(secretKeyBuffer);

      try {
        await web3.eth.sendSignedTransaction(transaction.serialize());
        assert.fail("sendSignedTransaction promiEvent should reject");
      } catch (err) {
        assert(
          err.message.indexOf("the tx doesn't have the correct nonce. account has nonce of: 2 tx has nonce of: 255") >=
            0
        );
      }
    });

    it("should succeed with right nonce", async function() {
      const nonce = await web3.eth.getTransactionCount(accounts[0]);

      const transaction = new Transaction({
        value: "0x10000000",
        gasLimit: "0x33450",
        from: accounts[0],
        to: accounts[1],
        nonce: to.rpcQuantityHexString(nonce)
      });

      const secretKeyBuffer = Buffer.from(secretKeys[0].substr(2), "hex");
      transaction.sign(secretKeyBuffer);

      const receipt = await web3.eth.sendSignedTransaction(transaction.serialize());
      assert.strictEqual(receipt.status, true);
    });

    it("should fail with bad nonce (skipped value)", async function() {
      const nonce = await web3.eth.getTransactionCount(accounts[0]);

      const transaction = new Transaction({
        value: "0x10000000",
        gasLimit: "0x33450",
        from: accounts[0],
        to: accounts[1],
        nonce: to.rpcQuantityHexString(nonce + 1) // Skipped nonce
      });

      const secretKeyBuffer = Buffer.from(secretKeys[0].substr(2), "hex");
      transaction.sign(secretKeyBuffer);

      try {
        await web3.eth.sendSignedTransaction(transaction.serialize());
        assert.fail("sendSignedTransaction promiEvent should reject");
      } catch (err) {
        assert.notDeepStrictEqual(err, null, "Incorrect nonce, tx should fail.");
      }
    });

    it("should respond with correct txn hash", async function() {
      const transaction = new Transaction({
        value: "0x0",
        gasLimit: "0x5208",
        from: accounts[0],
        to: accounts[1],
        nonce: "0x3"
      });

      const secretKeyBuffer = Buffer.from(secretKeys[0].substr(2), "hex");
      transaction.sign(secretKeyBuffer);

      const result = await web3.eth.sendSignedTransaction(transaction.serialize());
      assert.strictEqual(result.transactionHash, to.hex(transaction.hash()));
    });

    it("should allow a tx to contain data when sent to an external (personal) address", async function() {
      const transaction = new Transaction({
        value: "0x10000000",
        gasLimit: "0x33450",
        from: accounts[6],
        to: accounts[8],
        data: "0xd46e8dd67c5d32be8d46e8dd67c5d32be8058bb8eb970870f072445675058bb8eb970870f072445675"
      });

      const secretKeyBuffer = Buffer.from(secretKeys[6].substr(2), "hex");
      transaction.sign(secretKeyBuffer);

      const receipt = await web3.eth.sendSignedTransaction(transaction.serialize());
      assert.strictEqual(receipt.status, true, "Tx should be successful.");
    });

    it("should succeed with a gasPrice of 0", async function() {
      const transaction = new Transaction({
        value: "0x1",
        gasLimit: "0x5208",
        gasPrice: "0x0",
        from: accounts[5],
        to: accounts[1],
        nonce: "0x1"
      });

      const secretKeyBuffer = Buffer.from(secretKeys[5].substr(2), "hex");
      transaction.sign(secretKeyBuffer);

      // the account balance should be 1 wei less then when the test started
      // gas should have been free
      const balanceStart = new BN(await web3.eth.getBalance(accounts[5]));
      await web3.eth.sendSignedTransaction(transaction.serialize());
      const balanceEnd = new BN(await web3.eth.getBalance(accounts[5]));
      assert(balanceStart.sub(new BN(1)).eq(balanceEnd));
    });

    it("should succeed with wrong v value (temp until next breaking change)", async function() {
      const transaction = new Transaction({
        value: "0x10000000",
        gasLimit: "0x33450",
        from: accounts[7],
        to: accounts[8],
        nonce: "0x4",
        chainId: 123456789
      });

      const secretKeyBuffer = Buffer.from(secretKeys[0].substr(2), "hex");
      transaction.sign(secretKeyBuffer);

      await assert.doesNotReject(web3.eth.sendSignedTransaction(transaction.serialize()));

      assert(require("../../package.json").version.startsWith("2."), "Version 3 should change this so the test fails!");
    });
  });

  describe("eth_newFilter", function() {
    it("creates a new filter and returns the correctly formatted result", function(done) {
      var provider = web3.currentProvider;

      provider.send(
        {
          jsonrpc: "2.0",
          method: "eth_newFilter",
          params: [
            {
              fromBlock: "0x0",
              address: accounts[0],
              topics: []
            }
          ],
          id: new Date().getTime()
        },
        function(err, result) {
          if (err) {
            return done(err);
          }
          assert.strictEqual(result.result, "0x1");
          done();
        }
      );
    });
  });

  describe("contract scenario", function() {
    // These are expected to be run in order.
    let initialTransactionHash;
    let contractAddress;
    let contractCreationBlockNumber;

    it("should add a contract to the network (eth_sendTransaction)", async function() {
      const receipt = await web3.eth.sendTransaction({
        from: accounts[0],
        data: contract.binary,
        gas: 3141592,
        value: 1
      });
      initialTransactionHash = receipt.transactionHash;
      assert.deepStrictEqual(initialTransactionHash.length, 66);
      contractCreationBlockNumber = receipt.blockNumber; // For defaultBlock test

      contractAddress = receipt.contractAddress;

      assert(receipt.contractAddress, "should have deployed a contract");
    });

    it("should return null for the to field due to contract creation (eth_getTransactionReceipt)", async function() {
      const receipt = await web3.eth.getTransactionReceipt(initialTransactionHash);
      assert.strictEqual(receipt.to, null);
    });

    it("should verify the transaction immediately (eth_getTransactionByHash)", async function() {
      const send = pify(web3._provider.send.bind(web3._provider));
      // This test uses the provider directly because web3 fixes a bug we had for us.
      //  specifically, when the an rpc result field is `0x` it transform it to `null`
      //  `0x` is an incorrect response (it should be null). so we test for that here
      const jsonRpcResponse = await send({
        id: "1", // an "id" is required here because the web3 websocket provider (v1.0.0-beta.35) throws if it is
        // missing (it's probably just a bug on their end)
        jsonrpc: "2.0",
        method: "eth_getTransactionByHash",
        params: [initialTransactionHash]
      });
      const result = jsonRpcResponse.result;

      assert.notStrictEqual(result, null, "Transaction result shouldn't be null");
      assert.strictEqual(result.hash, initialTransactionHash, "Resultant hash isn't what we expected");
      assert.strictEqual(result.to, null, "Transaction receipt's `to` isn't `null` for a contract deployment");
    });

    it("should return null for a receipt for a nonexistent transaction (eth_getTransactionReceipt)", async function() {
      const receipt = await web3.eth.getTransactionReceipt("0xdeadbeef");
      assert.strictEqual(receipt, null, "Transaction receipt should be null");
    });

    it("should verify the code at the address matches the runtimeBinary (eth_getCode)", async function() {
      const code = await web3.eth.getCode(contractAddress);
      assert.strictEqual(code, contract.runtimeBinary);
    });

    it("should have balance of 1 (eth_getBalance)", async function() {
      const result = await web3.eth.getBalance(contractAddress);
      assert.strictEqual(result, "1");
    });

    it("should read data via a call (eth_call)", async function() {
      const callData = contract.callData;
      callData.to = contractAddress;
      callData.from = accounts[0];

      const startingBlockNumber = await web3.eth.getBlockNumber();
      const result = await web3.eth.call(callData);

      assert.strictEqual(to.number(result), 5);

      const number = await web3.eth.getBlockNumber();
      assert.strictEqual(number, startingBlockNumber, "eth_call increased block count when it shouldn't have");
    });

    it("should get back a runtime error on a bad call (eth_call)", async function() {
      const callData = _.cloneDeep(contract.callData);
      callData.to = contractAddress;
      callData.from = accounts[0];

      const gasEstimate = await web3.eth.estimateGas(callData);
      // set a low gas limit to force a runtime error
      callData.gas = gasEstimate - 1;

      try {
        await web3.eth.call(callData);
        // should have received an error
        assert.fail("did not return runtime error");
      } catch (err) {
        assert(
          /.*out of gas.*/.test(err.message),
          `Did not receive an 'out of gas' error. got '${err.message}' instead.`
        );
      }
    });

    it("should make a call from an address not in the accounts list (eth_call)", async function() {
      const from = "0x1234567890123456789012345678901234567890";

      // Assert precondition: Ensure from address isn't in the accounts list.
      accounts.forEach(function(account) {
        assert.notStrictEqual(
          from,
          account,
          "Test preconditions not met: from address must not be within the accounts list, please rerun"
        );
      });

      const callData = contract.callData;
      callData.to = contractAddress;
      callData.from = from;

      const result = await web3.eth.call(callData);
      assert.strictEqual(to.number(result), 5);
    });

    it("should make a call when no address is listed (eth_call)", async function() {
      const callData = contract.callData;
      callData.to = contractAddress;
      delete callData.from;

      const result = await web3.eth.call(callData);
      assert.strictEqual(to.number(result), 5);
    });

    it("should represent the block number correctly in the Oracle contract (oracle.blockhash0)", async function() {
      const { result: oracleOutput } = compile("./test/contracts/misc/", "Oracle");
      await web3.eth.personal.unlockAccount(accounts[0], "password");

      const contract = new web3.eth.Contract(oracleOutput.contracts["Oracle.sol"].Oracle.abi);
      const oracle = await contract
        .deploy({
          data: oracleOutput.contracts["Oracle.sol"].Oracle.evm.bytecode.object
        })
        .send({
          from: accounts[0],
          gas: 3141592
        });
      const block = await web3.eth.getBlock(0, true);
      const blockhash = await oracle.methods.blockhash0().call();
      assert.strictEqual(blockhash, block.hash);
    });

    it("should estimate gas of a transaction (eth_estimateGas)", async function() {
      const txData = contract.transaction_data;
      txData.to = contractAddress;
      txData.from = accounts[0];

      const startingBlockNumber = await web3.eth.getBlockNumber();

      const gasEstimate = await web3.eth.estimateGas(txData);
      assert.strictEqual(gasEstimate, 27535);

      const blockNumber = await web3.eth.getBlockNumber();

      assert.strictEqual(
        blockNumber,
        startingBlockNumber,
        "eth_estimateGas increased block count when it shouldn't have"
      );
    });

    it("should estimate gas from an unknown account (eth_estimateGas)", async function() {
      const txData = contract.transaction_data;
      txData.to = contractAddress;
      txData.from = "0x1234567890123456789012345678901234567890";

      const result = await web3.eth.estimateGas(txData);
      assert.strictEqual(result, 27535);
    });

    it("should estimate gas when no account is listed (eth_estimateGas)", async function() {
      const txData = contract.transaction_data;
      txData.to = contractAddress;
      delete txData.from;

      const result = await web3.eth.estimateGas(txData);
      assert.strictEqual(result, 27535);
    });

    it("should send a state changing transaction (eth_sendTransaction)", async function() {
      const txData = contract.transaction_data;
      txData.to = contractAddress;
      txData.from = accounts[0];

      const callData = contract.callData;
      callData.from = accounts[0];
      callData.to = contractAddress;

      const receipt = await web3.eth.sendTransaction(txData);
      assert.strictEqual(receipt.logs.length, 1, "Receipt had wrong amount of logs");
      assert.strictEqual(receipt.logs[0].blockHash, receipt.blockHash, "Logs blockhash doesn't match block blockhash");

      // Now double check the data was set properly.
      // NOTE: Because ethereumjs-testrpc processes transactions immediately,
      // we can do this. Calling the call immediately after the transaction would
      // fail on a different Ethereum client.
      const result = await web3.eth.call(callData);

      assert.strictEqual(to.number(result), 25);
    });

    it("should get only receipts relevant to the transaction (eth_getTransactionReceipt)", async function() {
      const txData = contract.transaction_data;
      txData.to = contractAddress;
      txData.from = accounts[0];

      // this test uses the provider's send instead of web3's sendTransaction
      // because web3's sendTransaction has a bug when instamining that can
      // cause it to subscribe to the `newHeads` event after the event has been
      // sent by the provider, which is obviously too late.
      const provider = web3.currentProvider;
      const hasSubscriptions = typeof provider.on === "function";
      const send = (() => {
        let id = 1;
        return (method, params) => {
          return pify(provider.send.bind(provider))({
            id: id++,
            jsonrpc: "2.0",
            method,
            params
          });
        };
      })();

      // stop mining
      await send("miner_stop");

      // queue some transactions
      const pendingTransactionHashes = [send("eth_sendTransaction", [txData]), send("eth_sendTransaction", [txData])];

      let pendingNextBlockNumber;
      if (hasSubscriptions) {
        pendingNextBlockNumber = new Promise((resolve) => {
          // Ganache.provider and WebSocket servers can use the EventEmitter
          provider.on("data", function newHeads(_, newHead) {
            if (newHead == null) {
              // When ganache is used as a provider _ is for errors,
              // when it is used as a websocket server _ is the data.
              newHead = _;
            }
            if (newHead.params.subscription === subscriptionId) {
              resolve(to.number(newHead.params.result.number));
              provider.removeListener("data", newHeads);
            }
          });
        });
      } else {
        pendingNextBlockNumber = (async() => {
          // for the HttpServer tests we need to poll for the next block
          const startingBlockNumber = await web3.eth.getBlockNumber();
          let currrentBlockNumber;
          do {
            currrentBlockNumber = await web3.eth.getBlockNumber();
          } while (currrentBlockNumber === startingBlockNumber);

          return currrentBlockNumber;
        })();
      }

      // subscribe to `newHeads` if subscriptions are supported
      const subscriptionId = hasSubscriptions ? (await send("eth_subscribe", ["newHeads"])).result : null;
      const transactionHashes = (await Promise.all(pendingTransactionHashes)).map((response) => response.result);

      // start the miner again
      await send("miner_start");

      // wait for the pending transactions to be mining in the next block
      const blockNumber = await pendingNextBlockNumber;

      // Now get the receipts
      const pendingReceipts = transactionHashes.map((txHash) => send("eth_getTransactionReceipt", [txHash]));
      const receipts = (await Promise.all(pendingReceipts)).map((response) => response.result);

      assert.strictEqual(receipts.length, 2, "Not enough receipts");
      receipts.forEach((receipt) => {
        const logs = receipt.logs;
        const receiptBlockNumber = to.number(receipt.blockNumber);
        // What we are testing is that two transactions that "log" in the same block have receipts with only
        // their own logs, and not each others. We only checking the blockNumber here to make sure they are the same.
        assert.strictEqual(receiptBlockNumber, blockNumber, "Receipt blockNumber doesn't match expected block number");
        assert.strictEqual(logs.length, 1, "Receipt had wrong amount of logs");
        assert(
          logs.every((l) => l.transactionHash === receipt.transactionHash),
          "Receipt log isn't valid"
        );
        assert(
          logs.every((l) => l.blockHash === receipt.blockHash),
          "Logs blockhash doesn't match block blockhash"
        );
      });
    });

    // NB: relies on the previous test setting value to 25 and the contract deployment setting
    // original value to 5. `contractCreationBlockNumber` is set in the first test of this
    // describe block.
    it("should read data via a call at a specified blockNumber (eth_call)", async function() {
      const callData = contract.callData;

      const startingBlockNumber = await web3.eth.getBlockNumber();
      let result = await web3.eth.call(callData);

      assert.strictEqual(
        result,
        "0x0000000000000000000000000000000000000000000000000000000000000019",
        "value retrieved from latest block should be 25"
      );

      result = await web3.eth.call(callData, contractCreationBlockNumber);
      assert.strictEqual(
        result,
        "0x0000000000000000000000000000000000000000000000000000000000000005",
        "value retrieved from contract creation block should be 5"
      );

      result = await web3.eth.getBlockNumber();
      assert.strictEqual(result, startingBlockNumber, "eth_call w/defaultBlock increased block count");

      result = await web3.eth.call(callData);
      assert.strictEqual(
        result,
        "0x0000000000000000000000000000000000000000000000000000000000000019",
        "stateTrie root was corrupted by defaultBlock call"
      );
    });

    it("should read data via a call when specified blockNumber is \"earliest\" (eth_call)", async function() {
      const callData = contract.callData;

      const result = await web3.eth.call(callData, "earliest");
      assert.strictEqual(result, "0x", "value retrieved from earliest block should be 0x");
    });

    it("should read data via a call when specified blockNumber is \"pending\" (eth_call)", async function() {
      const callData = contract.callData;

      const result = await web3.eth.call(callData, "pending");
      assert.strictEqual(
        result,
        "0x0000000000000000000000000000000000000000000000000000000000000019",
        "value retrieved from pending block should be 25"
      );
    });

    it("should error when reading data via a call at a non-existent blockNumber (eth_call)", async function() {
      const callData = contract.callData;

      const nonExistentBlock = (await web3.eth.getBlockNumber()) + 1;
      const result = await web3.eth.call(callData, nonExistentBlock);
      assert.strictEqual(result, null, "Result should be null");
    });

    it("should not error when using an invalid nonce (eth_call/eth_estimateGas)", async function() {
      const callData = {
        nonce: 999999,
        from: accounts[0],
        to: accounts[1],
        value: 1
      };

      const pendingCall = web3.eth.call(callData);
      await assert.doesNotReject(pendingCall);

      const pendingEstimate = web3.eth.estimateGas(callData);
      await assert.doesNotReject(pendingEstimate);
    });

    it("should only accept unsigned transaction from known accounts eth_sendTransaction)", async function() {
      const badAddress = "0x1234567890123456789012345678901234567890";

      const txData = {};
      txData.to = "0x1111111111000000000011111111110000000000";
      txData.from = badAddress;
      txData.value = "0x1";

      try {
        await web3.eth.sendTransaction(txData);
        assert.fail("expected promise rejection");
      } catch (err) {
        assert(
          /sender account not recognized/.test(err.message),
          `Expected error message containing 'sender account not recognized', but got ${err.message}`
        );
      }
    });

    it("should get the data from storage (eth_getStorageAt) with padded hex", async function() {
      const result = await web3.eth.getStorageAt(contractAddress, contract.position_of_value);
      assert.strictEqual(to.number(result), 25);
    });

    it("should get the data from storage (eth_getStorageAt) with unpadded hex", async function() {
      const result = await web3.eth.getStorageAt(contractAddress, "0x0");
      assert.strictEqual(to.number(result), 25);
    });

    it("should get the data from storage (eth_getStorageAt) with number", async function() {
      const result = await web3.eth.getStorageAt(contractAddress, 0);
      assert.strictEqual(to.number(result), 25);
    });
  });

  describe("contract scenario (raw tx)", function() {
    const tx = new Transaction({
      data: contract.binary,
      gasLimit: to.hex(3141592)
    });
    const privateKey = Buffer.from("e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109", "hex");
    const senderAddress = "0x" + utils.privateToAddress(privateKey).toString("hex");
    tx.sign(privateKey);
    const rawTx = "0x" + tx.serialize().toString("hex");

    // These are expected to be run in order.
    let initialTransactionHash;
    let blockHash;
    let blockNumber;
    let contractAddress;

    it("should first populate senders address", async function() {
      // populate senders balance
      const receipt = await web3.eth.sendTransaction({
        from: accounts[0],
        to: senderAddress,
        value: "0x3141592",
        gas: 3141592
      });
      assert(receipt);
    });

    it("should add a contract to the network (eth_sendRawTransaction)", async function() {
      const receipt = await web3.eth.sendSignedTransaction(rawTx);
      initialTransactionHash = receipt.transactionHash;
      contractAddress = receipt.contractAddress;
      blockHash = receipt.blockHash;
      blockNumber = receipt.blockNumber;

      assert.notStrictEqual(receipt, null, "Transaction receipt shouldn't be null");
      assert.notStrictEqual(contractAddress, null, "Transaction did not create a contract");
      assert.strictEqual(hasOwnProperty.call(receipt, "v"), false, "Transaction includes v signature parameter");
      assert.strictEqual(hasOwnProperty.call(receipt, "r"), false, "Transaction includes r signature parameter");
      assert.strictEqual(hasOwnProperty.call(receipt, "s"), false, "Transaction includes s signature parameter");
    });

    it("should verify the transaction immediately (eth_getTransactionByHash)", async function() {
      const result = await web3.eth.getTransaction(initialTransactionHash);

      assert.notStrictEqual(result, null, "Transaction result shouldn't be null");
      assert.strictEqual(result.hash, initialTransactionHash, "Resultant hash isn't what we expected");
      assert.strictEqual(result.to, null, "Transaction receipt's `to` isn't `null` for a contract deployment");
      assert.strictEqual(hasOwnProperty.call(result, "v"), true, "Transaction includes v signature parameter");
      assert.strictEqual(hasOwnProperty.call(result, "r"), true, "Transaction includes r signature parameter");
      assert.strictEqual(hasOwnProperty.call(result, "s"), true, "Transaction includes s signature parameter");
    });

    it("should return null if transaction doesn't exist (eth_getTransactionByHash)", async function() {
      const hash = "0x401b8ebb563ec9425b052aba8896cb74e07635563111b5a0663289d1baa8eb12";
      const result = await web3.eth.getTransaction(hash);
      assert.strictEqual(result, null, "Receipt should be null");
    });

    it("should verify there's code at the address (eth_getCode)", async function() {
      const result = await web3.eth.getCode(contractAddress);
      assert.notStrictEqual(result, null);
      assert.notStrictEqual(result, "0x");

      // NOTE: We can't test the code returned is correct because the results
      // of getCode() are *supposed* to be different than the code that was
      // added to the chain.
    });

    it("should get the transaction from the block (eth_getTransactionByBlockHashAndIndex)", async function() {
      const result = await web3.eth.getTransactionFromBlock(blockHash, 0);
      assert.strictEqual(result.hash, initialTransactionHash);
      assert.strictEqual(result.blockNumber, blockNumber);
      assert.strictEqual(result.blockHash, blockHash);
    });

    it("should return null if block doesn't exist (eth_getTransactionByBlockHashAndIndex)", async function() {
      const badBlockHash = "0xaaaaaaeb03ec5e3c000d150df2c9e7ffc31e728d12aaaedc5f6cccaca5aaaaaa";
      const result = await web3.eth.getTransactionFromBlock(badBlockHash, 0);
      assert.strictEqual(result, null);
    });

    it("should get the transaction from the block (eth_getTransactionByBlockNumberAndIndex)", async function() {
      const result = await web3.eth.getTransactionFromBlock(blockNumber, 0);
      assert.strictEqual(result.hash, initialTransactionHash);
      assert.strictEqual(result.blockNumber, blockNumber);
      assert.strictEqual(result.blockHash, blockHash);
    });

    it("should error for missing txns n block (eth_getTransactionByBlockNumberAndIndex)", async function() {
      try {
        await web3.eth.getTransactionFromBlock(blockNumber, 3);
        assert.fail("expected promise rejection");
      } catch (err) {}
    });
  });

  describe("eth_getTransactionCount", function() {
    it("should return 0 for non-existent account", async function() {
      const result = await web3.eth.getTransactionCount("0x1234567890123456789012345678901234567890");
      assert.strictEqual(result, 0);
    });

    it("should fail when given an invalid blockNumber", (done) => {
      const provider = web3.currentProvider;
      provider.send(
        {
          jsonrpc: "2.0",
          method: "eth_getTransactionCount",
          params: [
            accounts[0],
            "" // this is in invalid blockNumber
          ],
          id: new Date().getTime()
        },
        function(err, result) {
          if (err) {
            // Ganache provider responds with an `err`, so check that, too.
            assert.strictEqual(err.message, "Invalid `blockNumber`: \"\"");
          }
          if (result.error) {
            assert.strictEqual(result.error.message, "Invalid `blockNumber`: \"\"");
          } else {
            assert.fail("eth_getTransactionCount did not return an error message for invalid data");
          }
          done();
        }
      );
    });

    it("should return null for non-existent block", async function() {
      const result = await web3.eth.getTransactionCount("0x1234567890123456789012345678901234567890", 9999999);
      assert.strictEqual(result, null, "Should return null for non-existent block (GETH)");
    });
  });

  describe("eth_getTransactionByHash", function() {
    it("should return nonce as a quantity datatype when requested via RPC method", async function() {
      const send = pify(web3._provider.send.bind(web3._provider));
      const txHash = await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "eth_sendTransaction",
        params: [
          {
            from: accounts[8],
            to: accounts[9],
            value: 0
          }
        ]
      });

      const result = await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "eth_getTransactionByHash",
        params: [txHash.result]
      });

      assert.strictEqual(result.result.nonce, "0x0");
    }).timeout(4000);

    it("should return nonce as a number when requested via web3 method", async function() {
      const txHash = await web3.eth.sendTransaction({
        from: accounts[8],
        to: accounts[9],
        value: 0
      });

      const result = await web3.eth.getTransaction(txHash.transactionHash);

      assert.strictEqual(result.nonce, 1);
    });

    it("should return input as an unformatted datatype when requested via RPC method", async function() {
      const send = pify(web3._provider.send.bind(web3._provider));
      const txHash = await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "eth_sendTransaction",
        params: [
          {
            from: accounts[8],
            to: accounts[9],
            value: 0
          }
        ]
      });

      const result = await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "eth_getTransactionByHash",
        params: [txHash.result]
      });

      assert.strictEqual(result.result.input, "0x");
    });

    it("should return null for blockHash, blockNumber, and transactionIndex on a pending tx", async function() {
      const send = pify(web3._provider.send.bind(web3._provider));

      const txData = {
        to: accounts[0],
        from: accounts[1]
      };

      await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "miner_stop"
      });

      const result = await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "eth_sendTransaction",
        params: [txData]
      });

      const transactionObject = await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "eth_getTransactionByHash",
        params: [result.result]
      });

      assert.strictEqual(null, transactionObject.result.blockHash);
      assert.strictEqual(null, transactionObject.result.blockNumber);
      assert.strictEqual(null, transactionObject.result.transactionIndex);
    });

    it("should return values for blockHash, blockNumber, and transactionIndex once mined", async function() {
      const send = pify(web3._provider.send.bind(web3._provider));

      const txData = {
        to: accounts[0],
        from: accounts[1]
      };

      await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "miner_start",
        params: []
      });

      const result = await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "eth_sendTransaction",
        params: [txData]
      });

      const transactionObject = await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "eth_getTransactionByHash",
        params: [result.result]
      });

      assert.notStrictEqual(null, transactionObject.result.blockHash);
      assert.notStrictEqual(null, transactionObject.result.blockNumber);
      assert.notStrictEqual(null, transactionObject.result.transactionIndex);
    });
  });

  describe("eth_compileSolidity (not supported)", function() {
    this.timeout(5000);

    it("errors on compile solidity request", async function() {
      const result = await send("eth_compileSolidity", [source]).catch((error) => ({ error }));
      assert(result.error.message.indexOf("Method eth_compileSolidity not supported") >= 0);
    });
  });

  describe("miner_stop", function() {
    it("should stop mining", async function() {
      const send = pify(web3._provider.send.bind(web3._provider));
      await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "miner_stop"
      });

      const txData = {};
      txData.to = accounts[1];
      txData.from = accounts[0];
      txData.value = "0x1";

      // we don't use web3.eth.sendTransaction here because it gets huffy waiting for a receipt,
      // then winds up w/ an unhandled rejection on server.close later on
      const result = await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "eth_sendTransaction",
        params: [txData]
      });

      const txHash = result.result;

      const receipt = await web3.eth.getTransactionReceipt(txHash);

      assert.strictEqual(receipt, null);
      await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "miner_start",
        params: [1]
      });
    });
  });

  describe("miner_start", function() {
    it("should start mining", async function() {
      const send = pify(web3._provider.send.bind(web3._provider));
      await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "miner_stop"
      });

      await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "miner_start",
        params: [1]
      });

      const txData = {};
      txData.to = accounts[1];
      txData.from = accounts[0];
      txData.value = 0x1;

      const receipt = await web3.eth.sendTransaction(txData);
      assert.notStrictEqual(receipt, null); // i.e. receipt exists, so transaction was mined
    });

    it("should treat the threads argument as optional", async function() {
      const send = pify(web3._provider.send.bind(web3._provider));

      await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "miner_stop"
      });

      await send({
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "miner_start",
        params: []
      });

      const txData = {};
      txData.to = accounts[1];
      txData.from = accounts[0];
      txData.value = 0x1;

      const receipt = await web3.eth.sendTransaction(txData);
      assert.notStrictEqual(receipt, null); // i.e. receipt exists, so transaction was mined
    });
  });

  describe("web3_sha3", function() {
    it("should hash the given input", async function() {
      const send = pify(web3._provider.send.bind(web3._provider));
      const input = "Tim is a swell guy.";

      // web3.sha3() doesn't actually call the function, so we need to call it ourselves.
      const result = await send({
        jsonrpc: "2.0",
        method: "web3_sha3",
        params: [input],
        id: new Date().getTime()
      });

      assert.strictEqual(result.result, web3.utils.sha3(input));
    });
  });

  describe("net_version", function() {
    it("should return a version very close to the current time", async function() {
      const result = await web3.eth.net.getId();

      const dateAsInt = new Date().getTime() + "";
      const strResult = to.number(result) + "";

      assert.strictEqual(
        strResult.length,
        dateAsInt.length,
        `net_version result, ${result}` +
          `doesn't appear to be similar in length the current time as an integer, ${dateAsInt}`
      );
    });
  });

  describe("personal_newAccount", function() {
    it("should return the new address", async function() {
      const result = await web3.eth.personal.newAccount("password");
      assert.notStrictEqual(result.toLowerCase().match("0x[0-9a-f]{39}"), null, "Invalid address received");
    });
  });

  describe("personal_importRawKey", function() {
    it("should return the known account address", async function() {
      const send = pify(web3._provider.send.bind(web3._provider));
      const result = await send({
        jsonrpc: "2.0",
        id: 1234,
        method: "personal_importRawKey",
        params: ["0x0123456789012345678901234567890123456789012345678901234567890123", "password"]
      });
      assert.strictEqual(
        result.result,
        "0x14791697260e4c9a71f18484c9f997b308e59325",
        "Raw account not imported correctly"
      );
    });
  });

  describe("personal_listAccounts", function() {
    it("should return more than 0 accounts", async function() {
      const result = await web3.eth.personal.getAccounts();
      assert.strictEqual(result.length, 13);
    });
  });

  describe("personal_unlockAccount", function() {
    it("should unlock account", async function() {
      const result = await web3.eth.personal.unlockAccount(personalAccount, "password");
      assert.strictEqual(result, true);
    });
  });

  describe("personal_lockAccount", function() {
    it("should lock account", async function() {
      const result = await web3.eth.personal.lockAccount(personalAccount);
      assert.strictEqual(result, true);
    });
  });
};

const logger = {
  log: function(message) {
    // console.log(message);
  }
};

describe("Provider:", function() {
  const Web3 = require("web3");
  const web3 = new Web3();
  web3.setProvider(
    Ganache.provider({
      logger: logger,
      seed: "1337"
      // so that the runtime errors on call test passes
    })
  );
  tests(web3);

  after("shutdown provider", async function() {
    const provider = web3._provider;
    web3.setProvider();
    await pify(provider.close)();
  });
});

describe("HTTP Server:", function() {
  const Web3 = require("web3");
  const web3 = new Web3();
  const port = 12345;
  let server;

  before("Initialize Ganache server", async function() {
    server = Ganache.server({
      logger: logger,
      seed: "1337"
      // so that the runtime errors on call test passes
    });

    await pify(server.listen)(port);
    web3.setProvider(new Web3.providers.HttpProvider("http://localhost:" + port));
  });

  after("Shutdown server", async function() {
    await pify(server.close)();
  });

  tests(web3);
});

describe("WebSockets Server:", function() {
  const Web3 = require("web3");
  const web3 = new Web3();
  const port = 12345;
  let server;

  before("Initialize Ganache server", async function() {
    server = Ganache.server({
      logger: logger,
      seed: "1337"
      // so that the runtime errors on call test passes
    });
    await pify(server.listen)(port);
    const provider = new Web3WsProvider("ws://localhost:" + port);
    web3.setProvider(provider);
  });

  tests(web3);

  it("Can also handle binary websocket data", async() => {
    // Python web3 only sends binary over websockets and we should
    // be able to handle it.

    // web3.eth.getAccounts transmits over utf8, so use that as our baseline.
    const accounts = await web3.eth.getAccounts();

    // Listen for messages:
    const pendingMessage = new Promise((resolve, reject) => {
      function message(result) {
        cleanup();
        resolve(JSON.parse(result.data));
      }
      function close(err) {
        cleanup();
        reject(err.reason);
      }
      function cleanup() {
        web3.currentProvider.connection.removeEventListener("message", message);
        web3.currentProvider.connection.removeEventListener("close", close);
      }
      web3.currentProvider.connection.addEventListener("message", message);
      web3.currentProvider.connection.addEventListener("close", close);
    });

    // generate a binary jsonrpc message:
    const jsonRpc = Buffer.from(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 9999,
        method: "eth_accounts",
        params: []
      })
    );

    // send the binary data:
    web3.currentProvider.connection.send(jsonRpc);
    const result = await pendingMessage;

    // And compare
    assert.deepStrictEqual(
      result.result,
      accounts.map((a) => a.toLocaleLowerCase()),
      "Accounts don't match between binary and utf8 websocket requests!"
    );
  }).timeout(500); // fail quick if our hacked-together websocket handler fails.

  after("Shutdown server", async function() {
    const provider = web3._provider;
    web3.setProvider();
    provider.connection.close();
    await pify(server.close)();
  });
});
