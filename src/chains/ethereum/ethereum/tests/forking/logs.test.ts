import getProvider from "../helpers/getProvider";
import assert from "assert";
import { EthereumProvider } from "../../src/provider";
import compile from "../helpers/compile";
import { join } from "path";

describe("forking", function () {
  this.timeout(100000);

  describe("logs", () => {
    const blockNumber = 0xb77935; // 12024117
    const URL = "https://mainnet.infura.io/v3/" + process.env.INFURA_KEY;
    let provider: EthereumProvider;
    let contract: ReturnType<typeof compile>;
    let contractAddress: string;
    let accounts: string[];
    let someUserAddress: string;
    let receipts = [];

    before(async function () {
      if (!process.env.INFURA_KEY) {
        this.skip();
      }

      // USDT, has a lot of transfer events before block 12024117 == 0xb77935
      someUserAddress = "0xcdef4f34e5ceb46c7c55134cda34273349be65b7";
      contractAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
      provider = await getProvider({
        wallet: { unlockedAccounts: [someUserAddress] },
        fork: {
          url: URL,
          blockNumber,
          disableCache: true
        }
      });
      contract = compile(join(__dirname, "./contracts/IERC20.sol"));
      accounts = await provider.send("eth_accounts");
      for (let i = 0; i < accounts.length; i++) {
        const data =
          "0x" +
          contract.contract.evm.methodIdentifiers["transfer(address,uint256)"] +
          accounts[0].slice(2).padStart(64, "0") +
          i.toString().padStart(64, "0");
        const txHash = await provider.send("eth_sendTransaction", [
          {
            from: someUserAddress,
            to: contractAddress,
            gas: "0x2fefd8",
            data: data
          }
        ]);
        const txReceipt = await provider.send("eth_getTransactionReceipt", [
          txHash
        ]);
        receipts.push(txReceipt);
      }
    });

    describe("getLogs", () => {
      async function testReject(
        fromBlock: number | string,
        toBlock: number | string,
        expected: string,
        address: string = contractAddress
      ) {
        if (typeof fromBlock == "number") {
          fromBlock = `0x${fromBlock.toString(16)}`;
        }
        if (typeof toBlock === "number") {
          toBlock = `0x${toBlock.toString(16)}`;
        }
        await assert.rejects(
          provider.send("eth_getLogs", [
            {
              address,
              fromBlock,
              toBlock
            }
          ]),
          new Error(expected)
        );
      }

      async function testGetLogs(
        fromBlock: number | string,
        toBlock: number | string,
        expected: number,
        address: string = contractAddress
      ) {
        if (typeof fromBlock == "number") {
          fromBlock = `0x${fromBlock.toString(16)}`;
        }
        if (typeof toBlock === "number") {
          toBlock = `0x${toBlock.toString(16)}`;
        }
        const logs = await provider.send("eth_getLogs", [
          {
            address,
            fromBlock,
            toBlock
          }
        ]);
        assert.strictEqual(
          logs.length,
          expected,
          `there should be ${logs.length} log(s) between the ${fromBlock} block and the ${toBlock} block`
        );
      }

      it("should return the last tx log", async () => {
        const logs = await provider.send("eth_getLogs", [
          { address: contractAddress }
        ]);
        assert.strictEqual(logs.length, 1);
      });

      it("should filter out other blocks when using `latest`", async () => {
        const logs = await provider.send("eth_getLogs", [
          { address: contractAddress, toBlock: "latest", fromBlock: "latest" }
        ]);
        assert.strictEqual(logs.length, 1);
      });

      it("should filter appropriately when using fromBlock and toBlock", async () => {
        await testGetLogs(blockNumber - 2, blockNumber - 2, 13);
        await testGetLogs(blockNumber - 1, blockNumber - 1, 27);
        await testGetLogs(blockNumber, blockNumber, 84);
        await testGetLogs(blockNumber + 1, blockNumber + 1, 0); // blockNumber + 1 is an empty block => no logs
        await testGetLogs(blockNumber + 2, blockNumber + 2, 1);

        // tests ranges
        await testGetLogs(blockNumber - 2, blockNumber - 1, 13 + 27);
        await testGetLogs(blockNumber - 2, blockNumber, 13 + 27 + 84);
        await testGetLogs(blockNumber - 2, blockNumber + 1, 13 + 27 + 84);
        await testGetLogs(blockNumber - 2, blockNumber + 2, 13 + 27 + 84 + 1);

        await testGetLogs(blockNumber, blockNumber + 1, 84);
        await testGetLogs(blockNumber, blockNumber + 2, 84 + 1);

        await testGetLogs(blockNumber + 1, blockNumber + 2, 1);

        await testGetLogs(blockNumber + 2, blockNumber + 3, 2);
        await testGetLogs(
          blockNumber + 1,
          blockNumber + 1 + accounts.length,
          accounts.length
        );
      });

      it("should revert when using fromBlock and toBlock with strange values", async () => {
        const fromBlock = `0x${blockNumber.toString(16)}`;
        const toBlock = `0x${(blockNumber - 1).toString(16)}`;
        await testReject(
          blockNumber,
          blockNumber - 1,
          "One of the blocks specified in filter (fromBlock, toBlock or blockHash) cannot be found."
        );
        await testReject(
          "latest",
          blockNumber,
          "One of the blocks specified in filter (fromBlock, toBlock or blockHash) cannot be found."
        );
        await testReject(
          "latest",
          "earliest",
          "One of the blocks specified in filter (fromBlock, toBlock or blockHash) cannot be found."
        );
        // This really depends on the forked network
        await testReject("earliest", "latest", "socket hang up");
      });

      it("should filter appropriately when using fromBlock and toBlock with tags", async () => {
        // block 0
        await testGetLogs("earliest", "earliest", 0);

        await testGetLogs(blockNumber - 1, "latest", 27 + 84 + accounts.length);
        await testGetLogs(blockNumber, "latest", 84 + accounts.length);
        await testGetLogs(blockNumber + 1, "latest", accounts.length);
        await testGetLogs(blockNumber + 2, "latest", accounts.length);
        await testGetLogs(blockNumber + 3, "latest", accounts.length - 1);
      });

      it("should filter appropriately when using blockHash", async () => {
        async function testGetLogs(
          blockNum: number,
          expected: number,
          address: string = contractAddress
        ) {
          const block = await provider.request({
            method: "eth_getBlockByNumber",
            params: [`0x${blockNum.toString(16)}`]
          });
          const logs = await provider.send("eth_getLogs", [
            { address, blockHash: block.hash }
          ]);
          assert.strictEqual(
            logs.length,
            expected,
            `there should be ${expected} log(s) at the ${block.hash} block`
          );
        }

        await testGetLogs(blockNumber - 1, 27);
        await testGetLogs(blockNumber, 84);
        await testGetLogs(blockNumber + 1, 0);
        await testGetLogs(blockNumber + 2, 1);

        const logs = await provider.send("eth_getLogs", [
          {
            address: contractAddress,
            blockHash:
              "0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddeaddead"
          }
        ]);
        assert.strictEqual(logs.length, 0, `there should be 0 log(s)`);
      });
    });
  });
});
