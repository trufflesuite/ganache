import getProvider from "../../helpers/getProvider";
import compile, { CompileOutput } from "../../helpers/compile";
import assert from "assert";
import { EthereumProvider } from "../../../src/provider";
import path from "path";
import { Quantity, Data } from "@ganache/utils";

import { Account, TraceStorageMap } from "@ganache/ethereum-utils";
import { Common } from "@ethereumjs/common";
import { EthereumOptionsConfig } from "@ganache/ethereum-options";
import { Address } from "@ganache/ethereum-address";
import {
  LegacyTransaction,
  TransactionFactory
} from "@ganache/ethereum-transaction";
import Blockchain from "../../../src/blockchain";

describe("api", () => {
  describe("debug", () => {
    let contract: CompileOutput;
    let provider: EthereumProvider;
    let accounts: Array<string>;
    let from: string;
    let contractAddress: string;
    let transactionHash: string;
    let initialValue: string;
    let methods: Record<string, string>;

    before(async () => {
      contract = compile(
        path.join(__dirname, "..", "..", "contracts", "Debug.sol")
      );

      provider = await getProvider({
        miner: {
          defaultTransactionGasLimit: 6721975
        }
      });

      [from] = await provider.send("eth_accounts");

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

      methods = contract.contract.evm.methodIdentifiers;

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
      await provider.send("eth_sendTransaction", [
        {
          from,
          to: contractAddress,
          data: "0x" + methods["setValue(uint256)"] + newValue
        }
      ]);

      await provider.once("message");

      await provider.send("eth_sendTransaction", [
        { from, to: contractAddress, data: "0x" + methods["doARevert()"] }
      ]);
    });

    it("should trace a successful transaction without changing state", async () => {
      const { structLogs } = await provider.send("debug_traceTransaction", [
        transactionHash,
        {}
      ]);

      // "So basic" test - did we at least get some structlogs?
      assert(structLogs.length > 0);

      // Check formatting of stack
      for (const [, { stack }] of structLogs.entries()) {
        if (stack.length > 0) {
          // check formatting of stack - it was broken when updating to ethereumjs-vm v2.3.3
          assert.strictEqual(stack[0].length, 64);
          assert.notStrictEqual(stack[0].substr(0, 2), "0x");
          break;
        }
      }

      // Check formatting of memory
      const expectedMemoryWordsLength = 593;
      let actualMemoryWordsLength = 0;
      for (const [, { memory }] of structLogs.entries()) {
        actualMemoryWordsLength += memory.length;
        assert(memory != null);
        if (memory.length > 0) {
          // check formatting of memory
          assert.strictEqual(memory[0].length, 64); // one word
          assert.notStrictEqual(memory[0].substring(0, 2), "0x"); // 0x prefixed
        }
      }
      assert.strictEqual(actualMemoryWordsLength, expectedMemoryWordsLength);

      const lastop = structLogs[structLogs.length - 1];

      assert.strictEqual(lastop.op, "STOP");
      assert.strictEqual(lastop.gasCost, 0);
      assert.strictEqual(lastop.pc, 166); // This will change if you edit Debug.sol

      // This makes sure we get the initial value back (the first transaction to setValue())
      // and not the value of the second setValue() transaction
      assert.strictEqual(
        lastop.storage[
          "0000000000000000000000000000000000000000000000000000000000000000"
        ],
        initialValue
      );

      // Finally, lets assert that performing the trace didn't change the data on chain
      const value = await provider.send("eth_call", [
        { from, to: contractAddress, data: "0x" + methods["value()"] }
      ]);

      // State of the blockchain should still be the same as the second transaction
      assert.strictEqual(
        value,
        "0x0000000000000000000000000000000000000000000000000000000000001337"
      );
    });

    it("should still trace reverted transactions", async () => {
      const { structLogs } = await provider.send("debug_traceTransaction", [
        transactionHash,
        {}
      ]);

      // This test mostly ensures we didn't get some type of error message
      // from the virtual machine on a reverted transaction.
      // If we haven't errored at this state, we're doing pretty good.

      // Let's make sure the last operation is a STOP instruction.
      const { op } = structLogs.pop();

      assert.strictEqual(op, "STOP");
    });

    it("should have a low memory footprint", async () => {
      // This test is more of a change signal than it is looking
      // for correct output. By including this test, we assert that
      // the number of objects referenced in the trace is exactly
      // what we expect. We can use the total amount of counted objects
      // as a proxy for memory consumed. Knowing when this amount
      // changes can help signal significant changes to memory consumption.

      // Expectations and test input. The expected number of objects
      // in the final trace is found through execution. Again,
      // this test is meant as a change detector, not necessarily a
      // failure detector.
      const expectedObjectsInFinalTrace = 126539;
      const timesToRunLoop = 100;
      const from = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";
      const privateKey = Data.from(
        "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
      );

      // The next line is gross, but it makes testing new values easy.
      const timesToRunLoopArgument = Data.from(
        Quantity.toBuffer(timesToRunLoop),
        32
      )
        .toString()
        .replace("0x", "");

      const address = Address.from(from);
      const initialAccounts = [new Account(address)];

      // The following will set up a vm, deploy the debugging contract,
      // then run the transaction against that contract that we want to trace.
      const common = Common.custom(
        { chainId: 1337, defaultHardfork: "berlin" },
        { baseChain: "mainnet" }
      );

      const blockchain = new Blockchain(
        // using berlin here because we need this test to cost 0 gas
        EthereumOptionsConfig.normalize({ chain: { hardfork: "berlin" } }),
        address
      );

      await blockchain.initialize(initialAccounts);

      // Deployment transaction
      const deploymentTransaction = TransactionFactory.fromRpc(
        {
          data: contract.code,
          from: from.toString(),
          gasLimit: Quantity.toString(6721975),
          nonce: Quantity.toString(0)
        },
        common
      );

      const deploymentTransactionHash = await blockchain.queueTransaction(
        deploymentTransaction,
        privateKey
      );

      await blockchain.once("block");

      const { contractAddress } = await blockchain.transactionReceipts.get(
        deploymentTransactionHash.toBuffer()
      );

      // Transaction to call the loop function
      const loopTransaction = new LegacyTransaction(
        {
          data: Data.from(
            Buffer.from(
              methods["loop(uint256)"] + timesToRunLoopArgument,
              "hex"
            )
          ).toString(),
          to: Address.from(contractAddress).toString(),
          from,
          gasLimit: Quantity.toString(6721975),
          nonce: "0x1",
          gasPrice: Quantity.toString(0)
        },
        common
      );
      loopTransaction.from = address;
      const loopTransactionHash = await blockchain.queueTransaction(
        loopTransaction,
        privateKey
      );

      await blockchain.once("block");

      // Get the trace so we can count all of the items in the result
      const trace = await blockchain.traceTransaction(
        loopTransactionHash.toString(),
        {}
      );

      // Now lets count the number of items within the trace. We intend to count
      // all individual literals as separate items, and object references as the
      // same object (e.g., only counted once). There might be some gotcha's here;
      // quality of this test is dependent on the correctness of the counter.

      const countMap = new Set();
      const stack: Array<any> = [trace];

      while (stack.length > 0) {
        // pop is faster than shift, outcome is the same
        let obj = stack.pop();

        // Create new objects for literals as they take up
        // their own memory slots
        if (typeof obj === "string") {
          obj = new String(obj);
        } else if (typeof obj === "number") {
          obj = new Number(obj);
        }

        // if counted, don't recount.
        if (countMap.has(obj)) {
          continue;
        }

        // Not counted? Set it.
        countMap.add(obj);

        // Let's not do anything with Strings, Numbers, & TraceData; we have them counted.
        if (
          !(obj instanceof String) &&
          !(obj instanceof Number) &&
          !(obj.toBuffer && obj.toJSON)
        ) {
          // key/value pairs that can be iterated over via for...of
          let entries: IterableIterator<[any, any]> | Array<[any, any]>;

          // Honestly I'm not entirely sure I need this special case
          // for this map, but I don't want to leave it out.
          if (obj instanceof TraceStorageMap) {
            entries = obj.entries();
          } else {
            entries = Object.entries(obj);
          }

          for (const [, value] of entries) {
            if (value != null) {
              stack.push(value);
            }
          }
        }
      }

      assert.strictEqual(countMap.size, expectedObjectsInFinalTrace);
    }).timeout(5000);
  });
});
