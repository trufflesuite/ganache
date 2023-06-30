import assert from "assert";
import { copySync, readdir, remove } from "fs-extra";
import tmp from "tmp-promise";
import getProvider from "./helpers/getProvider";
import { EthereumProvider } from "../src/provider";
import { join, normalize } from "path";

describe("database", () => {
  describe("resumption", () => {
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

  describe("migration", () => {
    before(function () {
      if (process.platform === "win32") {
        // The reason this is skipped is that on Windows: Github CI
        // fails with the error:
        //  `Uncaught OpenError: IO error: <...the path...>\vNull/MANIFEST-000010
        //: The filename, directory name, or volume label syntax is incorrect.`
        // I can't reproduce.
        this.skip();
      }
    });
    it("migrates blocks from version `null` to version `0`", async () => {
      // the `vNull` database was created using ganache v7.7.7 and encodes
      // blocks with type 1 and type 2 transactions encoded as `[type, ...raw]`
      // instead, of `[type, rlp.encode(rlp)]`. A side effect of this is that
      // the block's `size` property is computed incorrectly.
      const originalDbPath = join(__dirname, "databases", "vNull");
      const dbPath = normalize((await tmp.dir()).path);

      copySync(originalDbPath, dbPath); // use a copy of the test db
      let provider: EthereumProvider;

      let foundMigrationMessage = false;
      async function runTests() {
        foundMigrationMessage = false; // reset
        const options = {
          database: { dbPath },
          wallet: { deterministic: true },
          logging: {
            logger: {
              log: (msg: string) => {
                if (msg === "Migration complete") {
                  foundMigrationMessage = true;
                }
              }
            }
          }
        };
        provider = await getProvider(options);
        const block = await provider.request({
          method: "eth_getBlockByNumber",
          params: ["0x1", true]
        });
        // size is tested here and again below, but this one is explicit.
        // If this number needs to change due to a future hardfork or bug fix
        // I want you to _really_ think about why:
        assert.strictEqual(block.size, "0x277");

        // note: this expected JSON response might need to be updated if new
        // metadata fields are added to transaction JSON in future hardforks
        assert.deepStrictEqual(
          block,
          {
            hash: "0xdcb89e1e8561645842b0cdc59d112b24b89619b13a61415cafac6afa86514152",
            parentHash:
              "0x014df187d1926afdb272143e204dc6e9a29021e7592d885b3fa94be820b10d49",
            sha3Uncles:
              "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
            miner: "0x0000000000000000000000000000000000000000",
            stateRoot:
              "0xe5fbb548d21f4a4a4f4a5c0782f36b2628feb035ddb44e9c99047770f7dc91b7",
            transactionsRoot:
              "0x461eaf505248dab9d1167b67ff123d126de41f450392fbddd9d0c7e36349d0bf",
            receiptsRoot:
              "0xf78dfb743fbd92ade140711c8bbc542b5e307f0ab7984eff35d751969fe57efa",
            logsBloom:
              "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            difficulty: "0x0",
            number: "0x1",
            gasLimit: "0x1c9c380",
            gasUsed: "0x5208",
            timestamp: "0x642ef1f7",
            extraData: "0x",
            mixHash:
              "0x95c4a5eb8ac8df5be0db6f40bccdecd841cc94f689c385790cde27c667c14a90",
            nonce: "0x0000000000000000",
            totalDifficulty: "0x0",
            baseFeePerGas: "0x342770c0",
            size: "0x277",
            transactions: [
              {
                type: "0x2",
                hash: "0x072746bec067d23b0218c571ae64c08663ff879ab5a63ac0c994452bb3c29625",
                chainId: "0x539",
                nonce: "0x0",
                blockHash:
                  "0xdcb89e1e8561645842b0cdc59d112b24b89619b13a61415cafac6afa86514152",
                blockNumber: "0x1",
                transactionIndex: "0x0",
                from: "0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1",
                to: "0x09acf7b7266b950eb1eb1222d036d6da3f015cbd",
                value: "0x11",
                maxPriorityFeePerGas: "0x3b9aca00",
                maxFeePerGas: "0x4201eab3",
                gasPrice: "0x4201eab3",
                gas: "0xffffff",
                input: "0x",
                accessList: [],
                v: "0x0",
                r: "0x48507a6e4e1e7bdbcdb0a5021195d13d7c2a1b89f06555049bca5cc246b6f7d4",
                s: "0x487a3f23364c97c469f8ee948a9de2bdc80a4502046625793f664bb7be4c0cd9"
              }
            ],
            uncles: []
          },
          "Migrated block is not as expected"
        );

        await provider.disconnect();
      }
      // first time we run the tests a migration occurs, this tests that a)
      // the migration happens and the provider can be used right away.
      await runTests();
      assert(
        foundMigrationMessage,
        "Migration message not found when it should be"
      );

      // the second time we run the tests we are testing that the migration
      // actually persisted, and that we don't migrate a second time.
      await runTests();
      assert(
        !foundMigrationMessage,
        "Migration message found when it should not be"
      );
    });
  });
});
