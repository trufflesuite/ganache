
import getProvider from "../../helpers/getProvider";
import assert from "assert";
import EthereumProvider from "../../../src/provider";
import compile from "../../helpers/compile";
import { join } from "path";

describe("api", () => {
  describe("eth", () => {
    describe("logs", () => {
      let provider: EthereumProvider;
      let contract: ReturnType<typeof compile>;
      let contractAddress: string;
      let accounts: string[];
      beforeEach(async () => {
        contract = compile(join(__dirname, "./contracts/Logs.sol"));
        provider = await getProvider();
        accounts = await provider.send("eth_accounts");

        await provider.send("eth_subscribe", ["newHeads"]);
        const transactionHash = await provider.send("eth_sendTransaction", [{
          from: accounts[0],
          data: contract.code,
          gas: 3141592
        }]);
        await provider.once("message");
        const transactionReceipt = await provider.send("eth_getTransactionReceipt", [transactionHash]);
        contractAddress = transactionReceipt.contractAddress;
      });

      it("should return a log for the constructor transaction", async () => {
        const logs = await provider.send("eth_getLogs", [{address: contractAddress}]);
        assert.strictEqual(logs.length, 1);
      });

      it("should return the code at the deployed block number", async () => {
        await provider.send("eth_subscribe", ["newHeads"]);
        const numberOfLogs = 4;
        const data =  "0x" + contract.contract.evm.methodIdentifiers["logNTimes(uint8)"] + numberOfLogs.toString().padStart(64, "0");
        const txHash = await provider.send("eth_sendTransaction", [{
          from: accounts[0],
          to: contractAddress,
          gas: 3141592,
          data: data
        }]);
        await provider.once("message");
        const txReceipt = await provider.send("eth_getTransactionReceipt", [txHash]);
        assert.deepStrictEqual(txReceipt.logs.length, numberOfLogs);
        const logs = await provider.send("eth_getLogs", [{address: contractAddress}]);
        assert.deepStrictEqual(logs, txReceipt.logs);
      });

      it("should filter out other blocks when using `latest`", async () => {
        await provider.send("eth_subscribe", ["newHeads"]);
        const numberOfLogs = 4;
        const data =  "0x" + contract.contract.evm.methodIdentifiers["logNTimes(uint8)"] + numberOfLogs.toString().padStart(64, "0");
        const txHash = await provider.send("eth_sendTransaction", [{
          from: accounts[0],
          to: contractAddress,
          gas: 3141592,
          data: data
        }]);
        await provider.once("message");
        await provider.send("evm_mine");
        await provider.once("message");
        const logs = await provider.send("eth_getLogs", [{address: contractAddress, toBlock: "latest", fromBlock: "latest"}]);
        assert.strictEqual(logs.length, 0);
      });

      it("should filter appropriately when using fromBlock and toBlock", async () => {
        const genesisBlockNumber = "0x0";
        const deployBlockNumber = "0x1";
        const emptyBlockNumber = "0x2";
        await provider.send("evm_mine"); // 0x2

        await provider.send("eth_subscribe", ["newHeads"]);
        const numberOfLogs = 4;
        const data =  "0x" + contract.contract.evm.methodIdentifiers["logNTimes(uint8)"] + numberOfLogs.toString().padStart(64, "0");
        const txHash = await provider.send("eth_sendTransaction", [{
          from: accounts[0],
          to: contractAddress,
          gas: 3141592,
          data: data
        }]); // 0x3
        await provider.once("message");
        const {blockNumber} = await provider.send("eth_getTransactionReceipt", [txHash]);

        async function testGetLogs(fromBlock: string, toBlock: string, expected: number, address: string = contractAddress){
          const logs = await provider.send("eth_getLogs", [{address, fromBlock, toBlock}]);
          assert.strictEqual(logs.length, expected, `there should be ${expected} log(s) between the ${fromBlock} block and the ${toBlock} block`);
        }

        // tests ranges up to latest/blockNumber
        await testGetLogs("earliest", "earliest", 0);
        await testGetLogs(genesisBlockNumber, genesisBlockNumber, 0);
        await testGetLogs("earliest", emptyBlockNumber, 1);
        await testGetLogs(genesisBlockNumber, emptyBlockNumber, 1);
        await testGetLogs("earliest", "latest", numberOfLogs + 1);
        await testGetLogs("earliest", blockNumber, numberOfLogs + 1);
        await testGetLogs(genesisBlockNumber, "latest", numberOfLogs + 1);
        await testGetLogs(genesisBlockNumber, blockNumber, numberOfLogs + 1);
        await testGetLogs(deployBlockNumber, "latest", numberOfLogs + 1);
        await testGetLogs(deployBlockNumber, blockNumber, numberOfLogs + 1);
        await testGetLogs(emptyBlockNumber, "latest", numberOfLogs);
        await testGetLogs(emptyBlockNumber, blockNumber, numberOfLogs);

        // tests variations where latest === blockNumber
        await testGetLogs(blockNumber, blockNumber, numberOfLogs);
        await testGetLogs(blockNumber, "latest", numberOfLogs);
        await testGetLogs("latest", blockNumber, numberOfLogs);
        await testGetLogs("latest", "latest", numberOfLogs);

        // mine an extra block
        await provider.send("evm_mine"); // 0x3
        const lastBlockNumber = `0x${(parseInt(blockNumber) + 1).toString(16)}`;
        await provider.once("message");


        // test variations of `earliest` and `0x0`
        await testGetLogs(genesisBlockNumber, genesisBlockNumber, 0);
        await testGetLogs("earliest", "earliest", 0);
        await testGetLogs("earliest", genesisBlockNumber, 0);
        await testGetLogs(genesisBlockNumber, "earliest", 0);

        // test misc ranges not already tests
        await testGetLogs(genesisBlockNumber, deployBlockNumber, 1);
        await testGetLogs("earliest", deployBlockNumber, 1);
        await testGetLogs("earliest", "latest", numberOfLogs + 1);
        await testGetLogs(genesisBlockNumber, "latest", numberOfLogs + 1);
        await testGetLogs(deployBlockNumber, "latest", numberOfLogs + 1);
        // test variations involving the last block number
        await testGetLogs(genesisBlockNumber, lastBlockNumber, numberOfLogs + 1);
        await testGetLogs(deployBlockNumber, lastBlockNumber, numberOfLogs + 1);
        await testGetLogs(emptyBlockNumber, lastBlockNumber, numberOfLogs);
        await testGetLogs(lastBlockNumber, "latest", 0);
        await testGetLogs("latest", lastBlockNumber, 0);
      });
    });
  });
});
