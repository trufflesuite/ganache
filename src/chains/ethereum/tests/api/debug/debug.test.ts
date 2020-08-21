import getProvider from "../../helpers/getProvider";
import compile, { CompileOutput } from "../../helpers/compile";
import assert from "assert";
import EthereumProvider from "../../../src/provider";
import path from "path";
import { Quantity, Data } from "@ganache/utils";
import { setUncaughtExceptionCaptureCallback } from "process";
import Blockchain from "../../../src/blockchain";
import Account from "../../../src/things/account";
import Address from "../../../src/things/address";
import Common from "ethereumjs-common";
import Transaction from "../../../src/things/transaction";
import { EthereumOptionsConfig } from "../../../src/options/index";

describe("api", () => {
  describe("debug", () => {
    let contract: CompileOutput;
    let provider: EthereumProvider;
    let accounts: Array<string>;
    let from: string;
    let contractAddress: string;
    let transactionHash: string;
    let initialValue: string;

    before(async () => {
      contract = compile(
        path.join(__dirname, "..", "..", "contracts", "Debug.sol")
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
      assert.strictEqual(lastop.pc, 191);

      // This makes sure we get the initial value back (the first transaction to setValue())
      // and not the value of the second setValue() transaction
      assert.strictEqual(
        lastop.storage[
          "0000000000000000000000000000000000000000000000000000000000000000"
        ],
        initialValue
      );
    });

    it("should have a low memory footprint", async () => {
      // This test is more of a change signal than it is looking
      // for correct output. By including this test, we assert that
      // "memory usage will never be more than X", and we keep
      // lowering X as we make optimizations to debug_traceTransaction

      // Expectations and test input
      let expectedMemoryConsumptionShallNotExceed = 2;
      let timesToRunLoop = 10000;

      // The next line is gross, but it makes testing new values easy.
      let timesToRunLoopArgument = Data.from(
        Quantity.from(timesToRunLoop).toBuffer(),
        32
      )
        .toString()
        .replace("0x", "");

      let initialAccounts = [new Account(new Address(accounts[0]))];

      let common = new Common("mainnet", "muirGlacier");

      let blockchain = new Blockchain(
        EthereumOptionsConfig.normalize({
          miner: {
            blockGasLimit: 126721975
          }
        }),
        common,
        initialAccounts,
        initialAccounts[0].address
      );

      await blockchain.once("start");

      // Deployment transaction
      let deploymentTransactionHash = await blockchain.queueTransaction(
        new Transaction(
          {
            data: contract.code,
            from: accounts[0],
            gasLimit: Quantity.from(6721975).toString(),
            nonce: "0x0"
          },
          common,
          Transaction.types.fake
        )
      );

      await blockchain.once("block");

      let receipt = await blockchain.transactionReceipts.get(
        deploymentTransactionHash.toBuffer()
      );

      console.log(deploymentTransactionHash.toString());

      // Transaction to call the loop function
      const methods = contract.contract.evm.methodIdentifiers;
      let loopTransactionHash = await blockchain.queueTransaction(
        new Transaction(
          {
            data: Buffer.from(
              methods["loop(uint256)"] + timesToRunLoopArgument,
              "hex"
            ),
            to: receipt.contractAddress,
            from: accounts[0],
            gasLimit: Quantity.from(6721975).toString(),
            nonce: "0x1"
          },
          common,
          Transaction.types.fake
        )
      );

      await blockchain.once("block");

      console.log(loopTransactionHash.toString());

      let initialMemoryUsage = process.memoryUsage();

      // We want to keep the return value in memory as that's the value
      // we're trying to ascertain the size of.
      let trace = await blockchain.traceTransaction(
        loopTransactionHash.toString(),
        {}
      );

      let finalMemoryUsage = process.memoryUsage();

      let memoryDiff = finalMemoryUsage.rss - initialMemoryUsage.rss;
      console.log(memoryDiff, trace.structLogs.length);
      assert(memoryDiff <= expectedMemoryConsumptionShallNotExceed);
    });
  });
});
