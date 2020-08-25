import getProvider from "../../helpers/getProvider";
import compile, { CompileOutput } from "../../helpers/compile";
import assert from "assert";
import EthereumProvider from "../../../src/provider";
import path from "path";
import { Quantity, Data } from "@ganache/utils";
import Blockchain from "../../../src/blockchain";
import Account from "../../../src/things/account";
import Address from "../../../src/things/address";
import Common from "ethereumjs-common";
import Transaction from "../../../src/things/transaction";
import { EthereumOptionsConfig } from "../../../src/options/index";
import TraceData from "../../../src/things/trace-data";
import TraceStorageMap from "../../../src/things/trace-storage-map";

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

      // "So basic" test - did we at least get some structlogs?
      assert(structLogs.length > 0);

      // Check formatting of stack
      for (const [index, op] of structLogs.entries()) {
        if (op.stack.length > 0) {
          // check formatting of stack - it was broken when updating to ethereumjs-vm v2.3.3
          assert.strictEqual(op.stack[0].length, 64);
          assert.notStrictEqual(op.stack[0].substr(0, 2), "0x");
          break;
        }
      }

      // Check formatting of memory
      for (const [index, op] of structLogs.entries()) {
        if (op.memory.length > 0) {
          // check formatting of memory
          assert.strictEqual(op.memory[0].length, 64);
          assert.notStrictEqual(op.memory[0].substr(0, 2), "0x");
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
      // the number of objects referenced in the trace is exactly
      // what we expect. We can use the total amount of counted objects
      // as a proxy for memory consumed. Knowing when this amount
      // changes can help signal significant changes to memory consumption.

      // Expectations and test input. The expected number of objects
      // in the final trace is found through execution. Again,
      // this test is meant as a change detector, not necessarily a
      // failure detector.
      let expectedObjectsInFinalTrace = 22843;
      let timesToRunLoop = 100;
      let address = "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1";
      let privateKey =
        "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";

      // The next line is gross, but it makes testing new values easy.
      let timesToRunLoopArgument = Data.from(
        Quantity.from(timesToRunLoop).toBuffer(),
        32
      )
        .toString()
        .replace("0x", "");

      let initialAccounts = [new Account(new Address(address))];

      // The following will set up a vm, deploy the debugging contract,
      // then run the transaction against that contract that we want to trace.
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
      var deploymentTransaction = new Transaction(
        {
          data: contract.code,
          from: address,
          gasLimit: Quantity.from(6721975).toString(),
          nonce: "0x0"
        },
        common
      );
      deploymentTransaction._from = Data.from(address).toBuffer();

      let deploymentTransactionHash = await blockchain.queueTransaction(
        deploymentTransaction,
        Data.from(privateKey)
      );

      await blockchain.once("block");

      let receipt = await blockchain.transactionReceipts.get(
        deploymentTransactionHash.toBuffer()
      );

      // Transaction to call the loop function
      const methods = contract.contract.evm.methodIdentifiers;
      let loopTransaction = new Transaction(
        {
          data: Buffer.from(
            methods["loop(uint256)"] + timesToRunLoopArgument,
            "hex"
          ),
          to: receipt.contractAddress,
          from: address,
          gasLimit: Quantity.from(6721975).toString(),
          nonce: "0x1"
        },
        common
      );
      loopTransaction._from = Data.from(address).toBuffer();
      let loopTransactionHash = await blockchain.queueTransaction(
        loopTransaction,
        Data.from(privateKey)
      );

      await blockchain.once("block");

      // Get the trace so we can count all of the items in the result
      let trace = await blockchain.traceTransaction(
        loopTransactionHash.toString(),
        {}
      );

      // Now lets count the number of items within the trace. We intend to count
      // all individual literals as separate items, and object references as the
      // same object (e.g., only counted once). There might be some gotcha's here;
      // quality of this test is dependent on the correctness of the counter.

      let countMap = new Map();
      let stack: Array<any> = [trace];

      while (stack.length > 0) {
        // pop is faster than shift, outcome is the same
        let obj = stack.pop();

        // Create new objects for literals as they take up
        // their own memory slots
        if (typeof obj == "string") {
          obj = new String(obj);
        } else if (typeof obj == "number") {
          obj = new Number(obj);
        }

        let isCounted = typeof countMap.get(obj) != "undefined";

        // if counted, don't recount.
        if (isCounted) {
          continue;
        }

        // Not counted? Set it.
        countMap.set(obj, 1);

        // Let's not do anything with Strings, Numbers, & TraceData; we have them counted.
        if (
          !(obj instanceof String) &&
          !(obj instanceof Number) &&
          !(obj instanceof TraceData)
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

          for (const [key, value] of entries) {
            if (value != null) {
              stack.push(value);
            }
          }
        }
      }

      assert.strictEqual(countMap.size, expectedObjectsInFinalTrace);
    });
  });
});
