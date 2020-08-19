const { BN } = require("ethereumjs-util");
const assert = require("assert");
const bootstrap = require("../helpers/contract/bootstrap");

describe("Checkpointing / Reverting", function() {
  let context;
  let startingBalance;
  let snapshotId;

  before("Set up provider with web3 instance and deploy a contract", async function() {
    this.timeout(10000);
    const contractRef = {
      contractFiles: ["snapshot"],
      contractSubdirectory: "snapshotting"
    };

    context = await bootstrap(contractRef);
  });

  before("send a transaction then make a checkpoint", async function() {
    const { accounts, send, web3 } = context;

    await web3.eth.sendTransaction({
      from: accounts[0],
      to: accounts[1],
      value: web3.utils.toWei(new BN(1), "ether"),
      gas: 90000
    });

    // Since transactions happen immediately, we can assert the balance.
    let balance = await web3.eth.getBalance(accounts[0]);
    balance = parseFloat(web3.utils.fromWei(balance, "ether"));

    // Assert the starting balance is where we think it is, including tx costs.
    assert(balance > 98.9 && balance < 99);
    startingBalance = balance;

    // Now checkpoint.
    snapshotId = await send("evm_snapshot");
  });

  it("rolls back successfully", async() => {
    const { accounts, send, web3 } = context;

    // Send another transaction, check the balance, then roll it back to the old one and check the balance again.
    const { transactionHash } = await web3.eth.sendTransaction({
      from: accounts[0],
      to: accounts[1],
      value: web3.utils.toWei(new BN(1), "ether"),
      gas: 90000
    });

    let balance = await web3.eth.getBalance(accounts[0]);
    balance = parseFloat(web3.utils.fromWei(balance, "ether"));

    // Assert the starting balance is where we think it is, including tx costs.
    assert(balance > 97.9 && balance < 98);

    const status = await send("evm_revert", snapshotId.result);

    assert(status, "Snapshot should have returned true");

    let revertedBalance = await web3.eth.getBalance(accounts[0]);
    revertedBalance = parseFloat(web3.utils.fromWei(revertedBalance, "ether"));

    assert(revertedBalance === startingBalance, "Should have reverted back to the starting balance");

    const oldReceipt = await web3.eth.getTransactionReceipt(transactionHash);
    assert.strictEqual(oldReceipt, null, "Receipt should be null as it should have been removed");
  });

  it("returns false when reverting a snapshot that doesn't exist", async() => {
    const { send } = context;

    const snapShotId1 = await send("evm_snapshot");
    const snapShotId2 = await send("evm_snapshot");
    const response1 = await send("evm_revert", snapShotId1.result);
    assert.strictEqual(response1.result, true, "Reverting a snapshot that exists does not work");
    const response2 = await send("evm_revert", snapShotId2.result);
    assert.strictEqual(response2.result, false, "Reverting a snapshot that no longer exists does not work");
    const response3 = await send("evm_revert", snapShotId1.result);
    assert.strictEqual(response3.result, false, "Reverting a snapshot that hasn't already been reverted does not work");
    const response4 = await send("evm_revert", 999);
    assert.strictEqual(response4.result, false, "Reverting a snapshot that has never existed does not work");
  });

  it("checkpoints and reverts without persisting contract storage", async() => {
    const { accounts, instance, send } = context;

    const snapShotId = await send("evm_snapshot");
    const n1 = await instance.methods.n().call();
    assert.strictEqual(n1, "42", "Initial n is not 42");

    await instance.methods.inc().send({ from: accounts[0] });
    const n2 = await instance.methods.n().call();
    assert.strictEqual(n2, "43", "n is not 43 after first call to `inc`");

    await send("evm_revert", snapShotId.result);
    const n3 = await instance.methods.n().call();
    assert.strictEqual(n3, "42", "n is not 42 after reverting snapshot");

    // this is the real test. what happened was that the vm's contract storage
    // trie cache wasn't cleared when the vm's stateManager cache was cleared.
    await instance.methods.inc().send({ from: accounts[0] });
    const n4 = await instance.methods.n().call();
    assert.strictEqual(n4, "43", "n is not 43 after calling `inc` again");
  });

  it("evm_revert rejects invalid subscriptionId types without crashing", async() => {
    const { send } = context;
    const ids = [{ foo: "bar" }, true, false];
    await Promise.all(
      ids.map((id) => assert.rejects(send("evm_revert", id), /invalid type/, "evm_revert did not reject as expected"))
    );
  });

  it("evm_revert rejects null/undefined subscriptionId values", async() => {
    const { send } = context;
    const ids = [null, undefined];
    await Promise.all(
      ids.map((id) =>
        assert.rejects(send("evm_revert", id), /invalid snapshotId/, "evm_revert did not reject as expected")
      )
    );
  });

  it("evm_revert returns false for out-of-range subscriptionId values", async() => {
    const { send } = context;
    const ids = [-1, Infinity, -Infinity, Buffer.from([0]), 0.5];
    const promises = ids.map((id) => send("evm_revert", id).then((r) => assert(r, false)));
    await Promise.all(promises);
  });
});
