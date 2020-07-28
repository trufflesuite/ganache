
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

      it("should return a log for the constructor tranasction", async () => {
        const logs = await provider.send("eth_getLogs", [{address: contractAddress}]);
        // assert.strictEqual(logs, []);
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
        // assert.deepStrictEqual(logs, txReceipt.logs);
      });
    });
  });
});
