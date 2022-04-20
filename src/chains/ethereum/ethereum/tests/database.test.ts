import assert from "assert";
import { readdir } from "fs-extra";
import tmp from "tmp-promise";
import getProvider from "./helpers/getProvider";
import { EthereumProvider } from "../src/provider";

describe("database", () => {
  let dbPath: string;
  let provider: EthereumProvider;
  let accounts: string[];

  function startProvider() {
    return getProvider({
      database: { dbPath },
      wallet: { deterministic: true }
    });
  }

  before(async () => {
    tmp.setGracefulCleanup();
    dbPath = (await tmp.dir()).path;
    provider = await startProvider();
    accounts = Object.keys(provider.getInitialAccounts());
  });

  afterEach(async () => {
    if (provider) {
      await provider.disconnect();
    }
  });

  it("resumes blockchain from a prior state", async () => {
    const dir = await readdir(dbPath);
    assert(dir.length > 0);

    // mine 256 blocks to ensure "latest" can be resumed properly
    // see https://github.com/trufflesuite/ganache/issues/2187
    await provider.request({ method: "evm_mine", params: [{ blocks: 256 }] });
    // send some value
    const [from, to] = accounts;
    const startingBalance = await provider.request({
      method: "eth_getBalance",
      params: [from]
    });
    await provider.request({
      method: "eth_sendTransaction",
      params: [{ from, to, value: "0xffffffffff" }]
    });
    const endingBalance = await provider.request({
      method: "eth_getBalance",
      params: [from]
    });
    const latestBlock = await provider.request({
      method: "eth_blockNumber",
      params: []
    });
    assert.notStrictEqual(endingBalance, startingBalance);

    await provider.disconnect();
    provider = await startProvider();

    const currentBalanceBeforeRevert = await provider.request({
      method: "eth_getBalance",
      params: [from]
    });
    assert.strictEqual(currentBalanceBeforeRevert, endingBalance);

    const currentBlockBeforeRevert = await provider.request({
      method: "eth_blockNumber",
      params: []
    });
    assert.strictEqual(currentBlockBeforeRevert, latestBlock);

    const snapshotId = await provider.request({
      method: "evm_snapshot",
      params: []
    });
    await provider.request({
      method: "eth_sendTransaction",
      params: [{ from, to, value: "0xffffffffff" }]
    });
    const endingBalanceAfterSnapshot = await provider.request({
      method: "eth_getBalance",
      params: [from]
    });
    const latestBlockAfterSnapshot = await provider.request({
      method: "eth_blockNumber",
      params: []
    });
    // make sure the transaction made changes:
    assert.notStrictEqual(endingBalanceAfterSnapshot, endingBalance);
    assert.notStrictEqual(latestBlockAfterSnapshot, latestBlock);

    // undo those changes by reverting the snapshot
    await provider.request({ method: "evm_revert", params: [snapshotId] });

    const endingBalanceAfterRevert = await provider.request({
      method: "eth_getBalance",
      params: [from]
    });
    const latestBlockAfterRevert = await provider.request({
      method: "eth_blockNumber",
      params: []
    });

    // make sure the revert worked (only checks in memory state, not the db):
    assert.strictEqual(endingBalanceAfterRevert, endingBalance);
    assert.strictEqual(latestBlockAfterRevert, latestBlock);

    await provider.disconnect();
    provider = await startProvider();

    // make sure the revert changes were persisted to the db:
    const balanceAfterRestart = await provider.request({
      method: "eth_getBalance",
      params: [from]
    });
    assert.strictEqual(balanceAfterRestart, endingBalance);

    const latestBlockAfterRestart = await provider.request({
      method: "eth_blockNumber",
      params: []
    });
    assert.strictEqual(latestBlockAfterRestart, latestBlock);
  });
});
