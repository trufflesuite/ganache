import getProvider from "../../helpers/getProvider";
import compile from "../../helpers/compile";
import assert from "assert";
import EthereumProvider from "../../../src/provider";
import path from "path";
import { setUncaughtExceptionCaptureCallback } from "process";

describe("api", () => {
  describe("debug", () => {
    let provider: EthereumProvider;
    let accounts: Array<string>;
    let from: string;
    let contractAddress: string;
    let transactionHash: string;
    let initialValue: string;

    before(async () => {
      let contract = compile(
        path.join(__dirname, "..", "..", "contracts", "HelloWorld.sol")
      );

      provider = await getProvider({
        miner: {
          defaultTransactionGasLimit: 6721975
        }
      });

      accounts = await provider.send("eth_accounts");
      from = accounts[1];

      await provider.send("eth_subscribe", ["newHeads"]);

      // Deploy the contract
      const deploymentTransactionHash = await provider.send(
        "eth_sendTransaction",
        [
          {
            from,
            data: contract.code
          }
        ]
      );

      await provider.once("message");

      const receipt = await provider.send("eth_getTransactionReceipt", [
        deploymentTransactionHash
      ]);
      contractAddress = receipt.contractAddress;

      const methods = contract.contract.evm.methodIdentifiers;

      // Send a transaction that will be the one we trace
      initialValue =
        "0000000000000000000000000000000000000000000000000000000000000019";
      transactionHash = await provider.send("eth_sendTransaction", [
        {
          from,
          to: contractAddress,
          data: "0x" + methods["setValue(uint256)"] + initialValue
        }
      ]);

      await provider.once("message");

      // Send another transaction thate changes the state, to ensure traces don't change state
      const newValue =
        "0000000000000000000000000000000000000000000000000000000000001337";
      const newTransactionHash = await provider.send("eth_sendTransaction", [
        {
          from,
          to: contractAddress,
          data: "0x" + methods["setValue(uint256)"] + newValue
        }
      ]);

      await provider.once("message");
    });

    describe("trace a successful transaction", () => {
      it("should trace a successful transaction without changing state", async () => {
        let response = await provider.send("debug_traceTransaction", [
          transactionHash,
          {}
        ]);

        const structLogs = response.structLogs;

        // To at least assert SOMETHING, let's assert the last opcode
        assert(structLogs.length > 0);

        for (const [index, op] of structLogs.entries()) {
          if (op.stack.length > 0) {
            // check formatting of stack - it was broken when updating to ethereumjs-vm v2.3.3
            assert.strictEqual(op.stack[0].length, 64);
            assert.notStrictEqual(op.stack[0].substr(0, 2), "0x");
            break;
          }
        }

        const lastop = structLogs[structLogs.length - 1];

        assert.strictEqual(lastop.op, "STOP");
        assert.strictEqual(lastop.gasCost, 0);
        assert.strictEqual(lastop.pc, 135);

        // This makes sure we get the initial value back (the first transaction to setValue())
        // and not the value of the second setValue() transaction
        assert.strictEqual(
          lastop.storage[
            "0000000000000000000000000000000000000000000000000000000000000000"
          ],
          initialValue
        );
      });
    });
  });
});
