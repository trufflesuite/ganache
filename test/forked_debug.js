const Web3 = require("web3");
const Web3WsProvider = require("web3-providers-ws");
const assert = require("assert");
const Ganache = require("../index.js");
const { promisify } = require("util");
const { compileAndDeploy } = require("./helpers/contract/compileAndDeploy");
const genSend = require("./helpers/utils/rpc");
const { join } = require("path");

const forkedTargetUrl = "ws://localhost:21345";

describe.skip("Debug", function() {
  let forkedServer;
  let forkedProvider;
  let forkedWeb3;
  let mainProvider;
  let mainWeb3;
  let accounts;
  let debugContract;
  let instance;
  let send;
  // var source = fs.readFileSync(path.join(__dirname, "DebugContract.sol"), "utf8");
  let hashToTrace = null;
  const expectedValueBeforeTrace = "1234";

  before("init forkedServer", async function() {
    forkedServer = Ganache.server({
      mnemonic: "sweet candy treat",
      ws: true,
      seed: "super seedy"
    });
    await promisify(forkedServer.listen)(21345);
  });

  before("init forked provider", function() {
    forkedProvider = new Web3WsProvider(forkedTargetUrl);
    forkedWeb3 = new Web3(forkedProvider);
  });

  before("get accounts", async function() {
    accounts = await forkedWeb3.eth.getAccounts();
  });

  before("compile and deploy to forked provider", async function() {
    this.timeout(10000);
    debugContract = await compileAndDeploy("DebugContract", [], join(__dirname, "contracts/debug"), forkedWeb3);
    instance = debugContract.instance;
  });

  before("set up transaction that should be traced", async function() {
    // This should execute immediately.
    var setValueTx = instance.methods.setValue(26);
    const { transactionHash: txHash } = await setValueTx.send({ from: accounts[0], gas: 3141592 });
    const value = await instance.methods.value().call({ from: accounts[0], gas: 3141592 });
    assert.strictEqual(value, "26");

    // Set the hash to trace to the transaction we made, so we know preconditions
    // are set correctly.
    hashToTrace = txHash;
  });

  before("change state of contract to ensure trace doesn't overwrite data", async function() {
    // This should execute immediately.
    const options = { from: accounts[0], gas: 3141592 };
    await instance.methods.setValue(parseInt(expectedValueBeforeTrace)).send(options);
    // Make sure we set it right.
    const value = await instance.methods.value().call({ from: accounts[0], gas: 3141592 });
    // Now that it's 85, we can trace the transaction that set it to 26.
    assert.strictEqual(value, expectedValueBeforeTrace);
  });

  before("init main provider and send", function() {
    mainProvider = Ganache.provider({
      mnemonic: "sweet candy treat",
      fork: forkedTargetUrl.replace("ws", "http"),
      seed: "super duper seedy"
    });
    send = genSend(mainProvider);
    mainWeb3 = new Web3(mainProvider);
  });

  it("should trace a successful transaction without changing state", async function() {
    // We want to trace the transaction that sets the value to 26
    const { result } = await send("debug_traceTransaction", hashToTrace, []);

    const length = result.structLogs.length;

    // To at least assert SOMETHING, let's assert the last opcode
    assert(length > 0, `Expected structLogs.length to be > 0, but was ${length}`);

    const lastop = result.structLogs[length - 1];

    assert.strictEqual(lastop.op, "STOP");
    assert.strictEqual(lastop.gasCost, 1);
    assert.strictEqual(lastop.pc, 131);
    const value = await debugContract.methods.value().call({ from: accounts[0], gas: 3141592 });
    // Did it change state?
    assert.strictEqual(value, expectedValueBeforeTrace, "debug_traceTransaction caused a state change");
  });

  after("Shutdown server", async function() {
    mainWeb3.setProvider();
    forkedWeb3.setProvider();
    if (forkedProvider.connection) {
      forkedProvider.connection.close();
    }
    await promisify(forkedServer.close)();
    await promisify(mainProvider.close)();
  });
});
