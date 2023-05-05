import { KNOWN_NETWORKS } from "@ganache/ethereum-options";
import getProvider from "../helpers/getProvider";
import skipIfNoInfuraKey from "../helpers/skipIfNoInfuraKey";
import http from "http";
import ganache from "../../../../../packages/core";
import assert from "assert";
import { EthereumProvider } from "../../src/provider";
import Server from "../../../../../packages/core/lib/src/server";
import { Quantity, WEI } from "@ganache/utils";
import {
  logging,
  startLocalChain,
  updateRemotesAccountsBalances,
  updateRemotesAccountNonces,
  range,
  encodeValue
} from "./helpers";
import compile from "../helpers/compile";
import path from "path";
import { CodedError } from "@ganache/ethereum-utils";

async function deployContract(
  remoteProvider: EthereumProvider,
  remoteAccounts: string[]
) {
  const contract = compile(path.join(__dirname, "contracts", "Forking.sol"));
  const subscriptionId = await remoteProvider.send("eth_subscribe", [
    "newHeads"
  ]);
  const deploymentHash = await remoteProvider.send("eth_sendTransaction", [
    {
      from: remoteAccounts[0],
      data: contract.code,
      gas: `0x${(3141592).toString(16)}`
    }
  ]);
  await remoteProvider.once("message");
  await remoteProvider.send("eth_unsubscribe", [subscriptionId]);
  const deploymentTxReceipt = await remoteProvider.send(
    "eth_getTransactionReceipt",
    [deploymentHash]
  );
  const { contractAddress } = deploymentTxReceipt;
  const contractBlockNum = parseInt(deploymentTxReceipt.blockNumber, 16);
  const methods = contract.contract.evm.methodIdentifiers;

  const contractCode = await remoteProvider.send("eth_getCode", [
    contractAddress
  ]);
  return {
    contractAddress,
    contractCode,
    contractBlockNum,
    methods
  };
}
const PORT = 9999;

describe("forking", function () {
  this.timeout(10000);

  const NETWORK_ID = 1234;
  const REMOTE_ACCOUNT_COUNT = 15;
  let remoteServer: Server;
  let remoteProvider: EthereumProvider;
  let remoteAccounts: string[];

  beforeEach("start remote chain", async () => {
    remoteServer = ganache.server({
      logging,
      wallet: { deterministic: true, totalAccounts: REMOTE_ACCOUNT_COUNT },
      chain: { networkId: NETWORK_ID }
    });
    remoteProvider = remoteServer.provider as unknown as EthereumProvider;
    remoteAccounts = Object.keys(remoteProvider.getInitialAccounts());
    await remoteServer.listen(PORT);
  });

  afterEach(async () => {
    try {
      remoteServer && remoteServer.status === 4 && (await remoteServer.close());
    } catch (e) {
      console.log(e);
    }
  });
  describe("invalid/exceptional responses", async () => {
    // contents of FAKE_BLOCK don't matter, it just needs to be parsable
    // by ganache
    const FAKE_BLOCK = {
      baseFeePerGas: "0x0",
      difficulty: "0x0",
      extraData: "0x0",
      gasLimit: "0x0",
      gasUsed: "0x0",
      hash: "0x925238ca364205c502b1771d80cd569e4200000b9aca6ded77fc8fe8f7b9e055",
      logsBloom: "0x0",
      miner: "0x0",
      mixHash:
        "0x393fc96d0a8261f7c2c75aef0eb2200a1e6c024ee59284ea1b5426132b30c406",
      nonce: "0x0",
      number: "0x1",
      parentHash:
        "0xf8c6cf0ee02ea9001964a3d9b47054eff5b0c3364614ee5422984aa69e4e0eee",
      receiptsRoot:
        "0xf4f972acf830ea9efb8afbb0973fb601d39e723277839b341727cd0b855b43a6",
      sha3Uncles:
        "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
      size: "0x0",
      stateRoot:
        "0x3627cfcfeeb0ef7085c79c2e4bdc9906a97b1edaae770147b0a3e4d10f497400",
      timestamp: "0x0",
      totalDifficulty: "0x0",
      transactions: []
    };
    const port = 9988;
    let junk: any;
    let server: http.Server;
    beforeEach("start mock http server", async () => {
      // mock a server so we can send bad requests back at ganache
      server = http.createServer((req, res) => {
        let body = "";
        req.on("data", data => {
          body += data;
        });
        req.on("end", function () {
          const json = JSON.parse(body);
          res.writeHead(200, { "content-type": "application/json" });
          if (json.method === "eth_getBalance") {
            // for any eth_getBalance call return the `junk` data
            res.end(JSON.stringify(junk));
          } else if (json.method === "eth_getBlockByNumber") {
            res.end(
              JSON.stringify({
                id: json.id,
                jsonrpc: "2.0",
                result: FAKE_BLOCK
              })
            );
          } else {
            // reply with a 0x1 for all the initialization requests just so
            // things start up
            res.end(
              JSON.stringify({ id: json.id, jsonrpc: "2.0", result: "0x1" })
            );
          }
        });
      });
      await new Promise<void>(resolve => server.listen(port, resolve));
    });
    afterEach("stop mock http server", done => {
      server && server.close(done);
    });
    it("handles invalid JSON-RPC responses", async () => {
      const { localProvider } = await startLocalChain(port, {
        url: `http://0.0.0.0:${port}`,
        disableCache: true
      });
      // some bad values to test
      const junks = [
        null,
        "",
        "a string",
        1234,
        { invalid: ["json-rpc"] },
        {},
        -9
      ];
      for (let j of junks) {
        junk = j;
        await assert.rejects(
          () =>
            localProvider.request({
              // the mock server returns junk for calls to `eth_getBalance`
              method: "eth_getBalance",
              params: ["0x2000000000000000000000000000000000000000"]
            }),
          {
            message: `Invalid response from fork provider: \`${JSON.stringify(
              junk
            )}\``
          }
        );
      }
    });
  });

  describe("providers", () => {
    it("throws on invalid provider", async () => {
      await assert.rejects(
        () =>
          startLocalChain(PORT, {
            provider: { request: "not a function" } as any,
            disableCache: true
          }),
        { message: "Forking `provider` must be EIP-1193 compatible" }
      );
    });

    describe("EIP-1193 providers", () => {
      let localProvider: EthereumProvider;
      beforeEach(
        "start up localProvider fork with remoteProvider",
        async () => {
          const provider = await startLocalChain(PORT, {
            provider: remoteProvider as any,
            disableCache: true
          });
          localProvider = provider.localProvider;
        }
      );

      afterEach("tear down network provider", async () => {
        localProvider && (await localProvider.disconnect());
      });

      it("should accept a provider instead of a url", async () => {
        const [remoteNetworkId, localNetworkId] = await Promise.all(
          [remoteProvider, localProvider].map(p => p.send("net_version", []))
        );
        assert.strictEqual(localNetworkId, remoteNetworkId);
      });

      it("should handle non json-rpc errors", async () => {
        // force remoteProvider.send to fail
        (remoteProvider as any).request = () => {
          return Promise.reject(new Error("Regular error"));
        };

        await assert.rejects(
          () =>
            localProvider.request({
              method: "eth_getBalance",
              params: ["0x2000000000000000000000000000000000000000"]
            }),
          { message: "Regular error" }
        );
      });

      it("should handle json-rpc errors", async () => {
        // force remoteProvider.send to fail
        (remoteProvider as any).request = () => {
          return Promise.reject(new CodedError("Coded error", 1234));
        };

        await assert.rejects(
          () =>
            localProvider.request({
              method: "eth_getBalance",
              params: ["0x2000000000000000000000000000000000000000"]
            }),
          { message: "Coded error", code: 1234 }
        );
      });
    });

    describe("legacy provider", () => {
      let localProvider: EthereumProvider;
      let onSend: (...args: any) => any;
      beforeEach("set up legacy provider", async () => {
        // remove our EIP-1193 request method so we can test how forking treats
        // legacy providers:
        const request = remoteProvider.request;
        (remoteProvider as any).request = undefined;

        const send = remoteProvider.send;
        remoteProvider.send = (...args: any) => {
          onSend && onSend(args);
          // now that forking has initialized we need to put the `request` method
          // back because `provider.send` uses it internally :-)
          if (!(remoteProvider as any).request) {
            remoteProvider.request = request;
          }
          return (send as any).apply(remoteProvider, args);
        };

        const provider = await startLocalChain(PORT, {
          provider: remoteProvider as any,
          disableCache: true
        });
        localProvider = provider.localProvider;

        // initialize the send method
        localProvider.request({
          method: "eth_getBalance",
          params: ["0x1000000000000000000000000000000000000000"]
        });
      });

      afterEach("tear down network provider", async () => {
        localProvider && (await localProvider.disconnect());
      });

      it("should accept a legacy provider instead of a url", async () => {
        // eavesdrops on `provider.send` to make sure it is actually being used by
        // this test.
        let sendCalled = false;
        onSend = () => {
          sendCalled = true;
        };

        await localProvider.request({
          method: "eth_getBalance",
          params: ["0x2000000000000000000000000000000000000000"]
        });
        assert(sendCalled, "remoteProvider.send wasn't called!");
      });

      it("should handle non json-rpc errors", async () => {
        // force remoteProvider.send to fail
        (remoteProvider as any).send = (_request, callback) => {
          callback(new Error("Regular error"));
        };

        await assert.rejects(
          () =>
            localProvider.request({
              method: "eth_getBalance",
              params: ["0x2000000000000000000000000000000000000000"]
            }),
          { message: "Regular error" }
        );
      });

      it("should handle json-rpc errors", async () => {
        // force remoteProvider.send to fail
        (remoteProvider as any).send = (_request, callback) => {
          callback(new CodedError("Coded error", 1234));
        };

        await assert.rejects(
          () =>
            localProvider.request({
              method: "eth_getBalance",
              params: ["0x2000000000000000000000000000000000000000"]
            }),
          { message: "Coded error", code: 1234 }
        );
      });
    });
  });

  describe("initial state", () => {
    it("should get the Network ID of the forked chain", async () => {
      const { localProvider } = await startLocalChain(PORT, {
        disableCache: true
      });

      const [remoteNetworkId, localNetworkId] = await Promise.all(
        [remoteProvider, localProvider].map(p => p.send("net_version", []))
      );
      assert.strictEqual(localNetworkId, remoteNetworkId);
      assert.strictEqual(remoteNetworkId, NETWORK_ID.toString());
    });

    it("should fork at the specified block number", async () => {
      const blocks = 10;
      await remoteProvider.request({
        method: "evm_mine",
        params: [{ blocks }]
      });
      const remoteBlockNumber = parseInt(
        await remoteProvider.request({ method: "eth_blockNumber", params: [] }),
        16
      );
      assert.strictEqual(remoteBlockNumber, 10);
      const localStartBlockNum = blocks / 2;
      const { localProvider } = await startLocalChain(PORT, {
        blockNumber: localStartBlockNum,
        disableCache: true
      });

      const localBlockNumber = parseInt(
        await localProvider.request({
          method: "eth_blockNumber",
          params: []
        })
      );

      assert.strictEqual(localBlockNumber, localStartBlockNum + 1);

      // and let's make sure we can get a block that exists after our for block number
      const localBlock = await localProvider.request({
        method: "eth_getBlockByNumber",
        params: ["0x" + remoteBlockNumber.toString(16), false]
      });
      assert.strictEqual(localBlock, null);
    });

    describe("block number", () => {
      let localProvider: EthereumProvider;
      beforeEach("start local chain", async () => {
        ({ localProvider } = await startLocalChain(PORT, {
          disableCache: true
        }));
      });

      it("local block number should be 1 after the remote block on start up", async () => {
        const [remoteBlock, localBlock] = await Promise.all(
          [remoteProvider, localProvider].map(provider =>
            provider.send("eth_blockNumber", [])
          )
        );
        assert.strictEqual(BigInt(localBlock), BigInt(remoteBlock) + 1n);
      });
    });

    describe("nonces", () => {
      let localProvider: EthereumProvider;
      beforeEach("update remote's accounts' nonces", async () => {
        await updateRemotesAccountNonces(remoteProvider, remoteAccounts);
      });

      beforeEach("start local chain", async () => {
        ({ localProvider } = await startLocalChain(PORT, {
          disableCache: true
        }));
      });

      it("should return the nonce of each account", async () => {
        // fetch the nonce of each account on the remote chain via the local chain
        await Promise.all(
          remoteAccounts.map((account, i) =>
            localProvider
              .request({ method: "eth_getTransactionCount", params: [account] })
              .then(nonce => {
                assert.strictEqual(nonce, `0x${(i + 1).toString(16)}`);
              })
          )
        );
      });
    });

    describe("balances", () => {
      let localProvider: EthereumProvider;
      let localAccounts: string[];
      beforeEach("update remote's accounts' balances", async () => {
        await updateRemotesAccountsBalances(remoteProvider, remoteAccounts);
      });

      beforeEach("start local chain", async () => {
        ({ localProvider, localAccounts } = await startLocalChain(PORT, {
          disableCache: true
        }));
      });

      it("should use `defaultBalanceEther` for balance of the initial accounts on the local chain", async () => {
        // fetch the nonce of each account on the remote chain via the local chain
        const options = localProvider.getOptions();
        await Promise.all(
          localAccounts.map(account =>
            localProvider.send("eth_getBalance", [account]).then(balance => {
              assert.strictEqual(
                BigInt(balance),
                WEI * BigInt(options.wallet.defaultBalance)
              );
            })
          )
        );
      });

      it("should NOT overwrite the `value` of the deterministic accounts that aren't on the local chain", async () => {
        // the remote chain is started with `REMOTE_ACCOUNT_COUNT` (15) accounts,
        // whereas the local chain is started with the default: 10
        assert(localAccounts.length < remoteAccounts.length);

        await Promise.all(
          // test only the accounts from the remote that we didn't also set up on the local chain
          remoteAccounts
            .slice(localAccounts.length - remoteAccounts.length) // a negative number
            .map(account =>
              Promise.all(
                [remoteProvider, localProvider].map(p =>
                  p.send("eth_getBalance", [account])
                )
              ).then(([remoteBalance, localBalance]) => {
                assert.strictEqual(localBalance, remoteBalance);
              })
            )
        );
      });
    });
  });

  describe("state changes", () => {
    let contractAddress: string;
    let methods: {
      [methodName: string]: string;
    };
    let contractCode: string;
    let contractBlockNum: number;

    function get(
      localProvider: EthereumProvider,
      value: string,
      blockNum: number
    ) {
      return localProvider.send("eth_call", [
        {
          from: remoteAccounts[0],
          to: contractAddress,
          data: `0x${methods[`${value}()`]}`
        },
        `0x${blockNum.toString(16)}`
      ]);
    }

    function set(provider: EthereumProvider, key: number, value: number) {
      const tx = makeTxForSet(key, value) as any;
      tx.gas = `0x${(3141592).toString(16)}`;

      return provider.send("eth_sendTransaction", [tx]);
    }

    function makeTxForSet(key: number, value: number) {
      const encodedKey = encodeValue(key);
      const encodedValue = encodeValue(value);

      return {
        from: remoteAccounts[0],
        to: contractAddress,
        data: `0x${
          methods[`setValueFor(uint8,uint256)`]
        }${encodedKey}${encodedValue}`
      };
    }

    async function getBlockNumber(provider: EthereumProvider) {
      return parseInt(await provider.send("eth_blockNumber", []), 16);
    }

    async function getBlockRanges(provider: EthereumProvider) {
      // our local chain starts at `localBlockNumberStart`.
      const blockNum = await getBlockNumber(provider);
      assert.strictEqual(
        contractBlockNum,
        1,
        "Failed sanity check; contract block number should be 1. Adjust test and check test to fix."
      );
      assert.strictEqual(
        blockNum,
        2,
        "Failed sanity check; local starting block number should be 2. Adjust test and check test to fix."
      );

      const blockNumbersWithCode = range(contractBlockNum, blockNum);
      const blockNumbersWithoutCode = range(0, contractBlockNum - 1);

      return { blockNum, blockNumbersWithCode, blockNumbersWithoutCode };
    }

    async function checkOriginalData(
      blockNumsWithCode: number[],
      get: (key: string, blockNum: number) => Promise<string>
    ) {
      return Promise.all(
        blockNumsWithCode.map(async blockNum => {
          const value0 = await get("value0", blockNum);
          assert.strictEqual(
            parseInt(value0, 16),
            0,
            `check failed at value0 block ${blockNum}`
          );

          const value1 = await get("value1", blockNum);
          assert.strictEqual(
            parseInt(value1, 16),
            2,
            `check failed at value1 block ${blockNum}`
          );

          const value2 = await get("value2", blockNum);
          assert.strictEqual(
            parseInt(value2, 16),
            1,
            `check failed at value2 block ${blockNum}`
          );

          const value3 = await get("value3", blockNum);
          assert.strictEqual(
            parseInt(value3, 16),
            0,
            `check failed at value3 block ${blockNum}`
          );

          const value4 = await get("value4", blockNum);
          assert.strictEqual(
            parseInt(value4, 16),
            1,
            `check failed at value4 block ${blockNum}`
          );
        })
      );
    }

    async function checkRangeForValue(
      blockNums: number[],
      value: string,
      get: (key: string, blockNum: number) => Promise<string>
    ) {
      return Promise.all(
        blockNums.map(blockNum =>
          range(0, 4).map(i =>
            get(`value${i}`, blockNum).then(v =>
              assert.strictEqual(
                v,
                value,
                `Incorrect value at block ${blockNum} for value${i}: ${v}`
              )
            )
          )
        )
      );
    }

    async function setAllValuesTo(
      provider: EthereumProvider,
      value: number,
      set: (key: number, value: number) => Promise<string>
    ) {
      // `set` the values 0-4 (value0, value1, etc), to `9`
      await provider.send("miner_stop");
      const subId = await provider.send("eth_subscribe", ["newHeads"]);
      const hashes = await Promise.all(
        Array.from({ length: 5 }, (_, i) => set(i, value))
      );
      await provider.send("miner_start");
      await provider.once("message");
      await provider.send("eth_unsubscribe", [subId]);
      await Promise.all(
        hashes.map(hash => provider.send("eth_getTransactionReceipt", [hash]))
      ).then(receipts =>
        receipts.forEach(receipt => {
          assert.notStrictEqual(receipt, null);
          assert.strictEqual(receipt.status, "0x1");
        })
      );
    }

    beforeEach("deploy contract", async () => {
      ({ contractAddress, contractCode, contractBlockNum, methods } =
        await deployContract(remoteProvider, remoteAccounts));
    });

    it("should fetch contract code from the remote chain via the local chain", async () => {
      const { localProvider } = await startLocalChain(PORT, {
        disableCache: true
      });
      const { blockNumbersWithCode, blockNumbersWithoutCode } =
        await getBlockRanges(localProvider);

      await Promise.all(
        blockNumbersWithCode.map(blockNumber =>
          localProvider
            .send("eth_getCode", [
              contractAddress,
              `0x${blockNumber.toString(16)}`
            ])
            .then(code => assert.strictEqual(code, contractCode))
        )
      );

      await Promise.all(
        blockNumbersWithoutCode.map(blockNumber =>
          localProvider
            .send("eth_getCode", [
              contractAddress,
              `0x${blockNumber.toString(16)}`
            ])
            .then(code => assert.strictEqual(code, "0x"))
        )
      );
    });

    it("should fetch initial contract data from the remote chain via the local chain", async () => {
      const { localProvider } = await startLocalChain(PORT, {
        disableCache: true
      });
      const { blockNum, blockNumbersWithCode, blockNumbersWithoutCode } =
        await getBlockRanges(localProvider);

      const _get = (value: string, blockNum: number) =>
        get(localProvider, value, blockNum);

      await Promise.all(
        blockNumbersWithCode.map(async blockNumber => {
          const value0 = await _get("value0", blockNumber);
          assert.strictEqual(parseInt(value0, 16), 0);

          const value1 = await _get("value1", blockNumber);
          assert.strictEqual(parseInt(value1, 16), 2);

          const value2 = await _get("value2", blockNumber);
          assert.strictEqual(parseInt(value2, 16), 1);

          const value3 = await _get("value3", blockNumber);
          assert.strictEqual(parseInt(value3, 16), 0);

          const value4 = await _get("value4", blockNumber);
          assert.strictEqual(parseInt(value4, 16), 1);
        })
      );

      await Promise.all(
        blockNumbersWithoutCode.map(async blockNumber => {
          const value0 = await _get("value0", blockNumber);
          assert.strictEqual(value0, "0x");

          const value1 = await _get("value1", blockNumber);
          assert.strictEqual(value1, "0x");

          const value2 = await _get("value2", blockNumber);
          assert.strictEqual(value2, "0x");

          const value3 = await _get("value3", blockNumber);
          assert.strictEqual(value3, "0x");

          const value4 = await _get("value4", blockNumber);
          assert.strictEqual(value4, "0x");
        })
      );
    });

    it("should fetch changed contract data from the remote chain via the local chain", async () => {
      const { localProvider } = await startLocalChain(PORT, {
        disableCache: true
      });
      const { blockNum, blockNumbersWithCode, blockNumbersWithoutCode } =
        await getBlockRanges(localProvider);

      function _set(key: number, value: number) {
        return set(localProvider, key, value);
      }

      const _get = (value: string, blockNum: number) =>
        get(localProvider, value, blockNum);

      await setAllValuesTo(localProvider, 9, _set);

      const postNineBlockNum = parseInt(
        await localProvider.send("eth_blockNumber", []),
        16
      );
      const blockNumsAfterNine = range(blockNum + 1, postNineBlockNum);

      // the blocks created before the `set` should still have the original values
      await checkOriginalData(blockNumbersWithCode, _get);

      // the pre-contract blocks should still have no values
      await checkRangeForValue(blockNumbersWithoutCode, "0x", _get);

      const nine =
        "0x0000000000000000000000000000000000000000000000000000000000000009";
      await checkRangeForValue(blockNumsAfterNine, nine, _get);

      // set all values to 0 (the EVM treats this as a "delete")
      await setAllValuesTo(localProvider, 0, _set);

      const postZeroBlockNum = parseInt(
        await localProvider.send("eth_blockNumber", []),
        16
      );
      const blockNumsAfterZero = range(postNineBlockNum + 1, postZeroBlockNum);

      // the pre-contract blocks should still have no values
      await checkRangeForValue(blockNumbersWithoutCode, "0x", _get);

      // the blocks created before the `set` should still have the original values
      await checkOriginalData(blockNumbersWithCode, _get);

      // post-nine-blocks that are pre-zero should still be set to nine
      await checkRangeForValue(blockNumsAfterNine, nine, _get);

      // after setting all values to zero, the values should be zero!
      const zero =
        "0x0000000000000000000000000000000000000000000000000000000000000000";
      await checkRangeForValue(blockNumsAfterZero, zero, _get);

      // set all values to 11
      await setAllValuesTo(localProvider, 11, _set);

      const postElevenBlockNum = parseInt(
        await localProvider.send("eth_blockNumber", []),
        16
      );
      const blockNumsAfterEleven = range(
        postZeroBlockNum + 1,
        postElevenBlockNum
      );

      // the pre-contract blocks should still have no values
      await checkRangeForValue(blockNumbersWithoutCode, "0x", _get);

      // the blocks created before the `set` should still have the original values
      await checkOriginalData(blockNumbersWithCode, _get);

      // post-nine-blocks that are pre-zero should still be set to nine
      await checkRangeForValue(blockNumsAfterNine, nine, _get);

      //  the values should still be zero!
      await checkRangeForValue(blockNumsAfterZero, zero, _get);

      // after setting all values to a number again (11), the values should be 11!
      const eleven =
        "0x000000000000000000000000000000000000000000000000000000000000000b";
      await checkRangeForValue(blockNumsAfterEleven, eleven, _get);
    });

    describe("snapshot/revert", () => {
      async function testPermutations(
        localProvider: EthereumProvider,
        initialValue: number,
        snapshotValues: number[]
      ) {
        for await (const snapshotValue of snapshotValues) {
          // set value1 to {snapshotValue}
          await set(localProvider, 1, snapshotValue);
          const message = await localProvider.once("message");
          const blockNumber = parseInt((message.data.result as any).number, 16);
          const checkValue = await get(localProvider, "value1", blockNumber);
          assert.strictEqual(
            Quantity.toNumber(checkValue),
            snapshotValue,
            `Value after snapshot not as expected. Conditions: ${initialValue}, ${JSON.stringify(
              snapshotValues
            )}. snapshotValue: ${snapshotValue}`
          ); //sanity check
        }
      }

      /**
       *  - Initializes `localProvider` as a fork of `remoteProvider`.
       *  - Sets `value1` to `localInitialValue` (if it is not null).
       *  - Creates a snapshot .
       *  - Iterates `snapshotValues`, setting `value1` to each of those values.
       *  - Reverts.
       *  - Ensures that `value1` has reverted to either `localInitialValue` or
       *    `remoteInitialValue` (if the `localInitialValue` was not provided).
       */
      async function initializeSnapshotSetRevertThenTest(
        remoteInitialValue: number,
        localInitialValue: number | null,
        snapshotValues: number[]
      ) {
        const expectedValueAfterRevert =
          localInitialValue == null ? remoteInitialValue : localInitialValue;

        const { localProvider } = await startLocalChain(PORT, {
          disableCache: true
        });
        const subId = await localProvider.send("eth_subscribe", ["newHeads"]);

        if (localInitialValue !== null) {
          // set value1 to {initialValue} (note: if the value is `0` it actually deletes it from the state)
          await set(localProvider, 1, localInitialValue);
          await localProvider.once("message");

          assert.strictEqual(
            +(await get(
              localProvider,
              "value1",
              await getBlockNumber(localProvider)
            )),
            localInitialValue
          ); // sanity check
        }

        const initialBlockNumber = await getBlockNumber(localProvider);

        const snapId = await localProvider.send("evm_snapshot");
        await testPermutations(
          localProvider,
          expectedValueAfterRevert,
          snapshotValues
        );
        await localProvider.send("evm_revert", [snapId]);

        assert.strictEqual(
          initialBlockNumber,
          await getBlockNumber(localProvider)
        ); // sanity check

        assert.strictEqual(
          +(await get(localProvider, "value1", initialBlockNumber)),
          expectedValueAfterRevert,
          "value was not reverted to `initialValue` after evm_revert"
        );

        // Finally, check all permutations outside of the snapshot/revert to
        // make sure deleted state was properly reverted
        await testPermutations(
          localProvider,
          expectedValueAfterRevert,
          snapshotValues
        );

        await localProvider.send("eth_unsubscribe", [subId]);
      }

      const initialValues = [null, 0, 1]; // null means to _not_ set an initial value
      // test all permutations of values: 0, 1, 2
      const permutations = [
        [0],
        [1],
        [2],
        [0, 1],
        [0, 2],
        [1, 0],
        [1, 2],
        [2, 0],
        [2, 1],
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0]
      ];
      for (const remoteInitialValue of initialValues) {
        for (const initialValue of initialValues) {
          for (const permutation of permutations) {
            it(`should revert to previous value after snapshot/{change}/revert, fork value: ${remoteInitialValue}, initialValue, ${initialValue}, permutation: ${JSON.stringify(
              permutation
            )}`, async () => {
              const subId = await remoteProvider.send("eth_subscribe", [
                "newHeads"
              ]);
              // set the remoteProvider's value1 initialValue to {remoteInitialValue} (only if not null)
              if (remoteInitialValue !== null) {
                await set(remoteProvider, 1, remoteInitialValue);
                await remoteProvider.once("message");
                await remoteProvider.send("eth_unsubscribe", [subId]);
                const blockNumber = await getBlockNumber(remoteProvider);
                assert.strictEqual(
                  parseInt(
                    await get(remoteProvider, "value1", blockNumber),
                    16
                  ),
                  remoteInitialValue
                ); // sanity check to make sure our initial conditions are correct
              }

              const blockNumber = await getBlockNumber(remoteProvider);
              const startValue = await get(
                remoteProvider,
                "value1",
                blockNumber
              );

              await initializeSnapshotSetRevertThenTest(
                +startValue,
                initialValue,
                permutation
              );
            });
          }
        }
      }
    });

    describe("gas estimation", () => {
      it("should not affect live state", async () => {
        const { localProvider } = await startLocalChain(PORT, {
          disableCache: true
        });
        const blockNum = await getBlockNumber(localProvider);

        // calling eth_estimateGas shouldn't change actual state, which is `2`
        const expectedValue = 2;
        const testValue = 0;
        assert.strictEqual(
          testValue,
          0,
          "the test value must be 0 in order to make sure the change doesn't get stuck in the delete cache"
        );
        const actualValueBefore = parseInt(
          await get(localProvider, "value1", blockNum)
        );
        assert.strictEqual(actualValueBefore, expectedValue);

        // make a tx that sets a value 1 to 0, we'll only use this for gas
        // estimation
        const tx = makeTxForSet(1, testValue);
        const est = await localProvider.request({
          method: "eth_estimateGas",
          params: [tx]
        });
        assert.notStrictEqual(est, "0x");

        // make sure the call to eth_estimateGas didn't change anything!
        const actualValueAfter = parseInt(
          await get(localProvider, "value1", blockNum)
        );
        assert.strictEqual(actualValueAfter, expectedValue);
      });
    });
  });

  describe("blocks", () => {
    let localProvider: EthereumProvider;
    beforeEach("start local chain", async () => {
      const [from, to] = remoteAccounts;
      const tx = {
        from,
        to
      };
      const subId = await remoteProvider.send("eth_subscribe", ["newHeads"]);
      await remoteProvider.send("eth_sendTransaction", [tx]);
      await remoteProvider.once("message");
      await remoteProvider.send("eth_unsubscribe", [subId]);

      ({ localProvider } = await startLocalChain(PORT));
    });

    it("ensure local block's latest matches remote block's latest (with transaction)", async () => {
      const [remoteBlock, localBlock] = await Promise.all(
        [remoteProvider, localProvider].map(provider =>
          provider.send("eth_getBlockByNumber", ["0x1", true])
        )
      );
      assert.deepStrictEqual(localBlock, remoteBlock);
    });
  });
});

describe("forking", () => {
  describe("fork block chainId-aware eth_call", function () {
    this.timeout(10000);

    describe("contracts", () => {
      let contractAddress: string;
      let methods: { [methodName: string]: string };
      // EIP-1344 (which introduced the chainId opcode) was activated at block
      // 9,069,000 as part of the istanbul hardfork.
      // We can deploy out contract _before_ the hardfork in order to run tests
      // that will _fail_ because the feature we are testing doesn't exist yet.
      //  1. create our "fake mainnet" at block 9_068_996
      //     this test creates a fork of mainnet that _looks_ like mainnet (same
      //     chainId and networkId) so we can then fork from _that_. Ganache can't
      //     tell a different between our fake fork and the real thing.
      //  2. block number is now 9_068_997
      //  3. deploy at 9_068_998
      //  4. mine 2 extra blocks. now at at 9_069_000
      //  5. fork at 9_069_000
      const blockNumber = 9_068_996;
      let provider: EthereumProvider;
      let contractBlockNum: number;
      const URL = "https://mainnet.infura.io/v3/" + process.env.INFURA_KEY;
      let remoteProvider: EthereumProvider;
      let remoteAccounts: string[];

      skipIfNoInfuraKey();

      before("configure mainnet", async function () {
        // we fork from mainnet, but configure our fork such that it looks like
        // mainnet if you queried for its chainId and networkId

        remoteProvider = await getProvider({
          chain: {
            // force our external identifiers to match mainnet
            chainId: 1,
            networkId: 1
          },
          wallet: {
            deterministic: true
          },
          fork: {
            url: URL,
            blockNumber
          }
        });
        remoteAccounts = Object.keys(remoteProvider.getInitialAccounts());
      });

      before("deploy contract", async () => {
        // deploy the contract
        ({ contractBlockNum, contractAddress, contractBlockNum, methods } =
          await deployContract(remoteProvider, remoteAccounts));
      });

      before("fork from mainnet at contractBlockNum + 1", async () => {
        // progress the remote provider forward 2 additional blocks so we can call
        // `eth_call` with the `contractBlockNum` as the _parent_. This will
        // ensure that the block number of the _transaction_ runs in a block
        // context _before_ our fork point
        await remoteProvider.send("evm_mine", [{ blocks: 2 }]);

        provider = await getProvider({
          wallet: {
            deterministic: true
          },
          fork: {
            provider: remoteProvider as any,
            blockNumber: contractBlockNum + 2
          }
        });
      });

      it("should differentiate chainId before and after fork block", async () => {
        const tx = {
          from: remoteAccounts[0],
          to: contractAddress,
          data: `0x${methods[`getChainId()`]}`
        };
        const originalChainId = parseInt(
          await remoteProvider.send("eth_chainId")
        );
        assert.strictEqual(originalChainId, 1); // sanity check

        const originalChainIdCall = await remoteProvider.send("eth_call", [
          tx,
          Quantity.toString(contractBlockNum)
        ]);
        assert.strictEqual(parseInt(originalChainIdCall), originalChainId);

        // check that our provider returns mainnet's chain id for an eth_call
        // at or before our fork block number
        const forkChainIdAtForkBlockCall = await provider.send("eth_call", [
          tx,
          Quantity.toString(contractBlockNum + 2)
        ]);
        assert.strictEqual(
          parseInt(forkChainIdAtForkBlockCall),
          originalChainId
        );

        // check that our provider returns our local chain id for an eth_call
        // after our fork block number
        const forkChainId = parseInt(await provider.send("eth_chainId"));
        assert.strictEqual(forkChainId, 1337); // sanity check
        const forkChainIdAfterForkBlockCall = await provider.send("eth_call", [
          tx,
          Quantity.toString(contractBlockNum + 3)
        ]);
        assert.strictEqual(
          parseInt(forkChainIdAfterForkBlockCall),
          forkChainId
        );
      });

      it("should fail to get chainId before EIP-155 was activated", async () => {
        const tx = {
          from: remoteAccounts[0],
          to: contractAddress,
          data: `0x${methods[`getChainId()`]}`
        };

        const originalChainId = parseInt(
          await remoteProvider.send("eth_chainId")
        );
        assert.strictEqual(originalChainId, 1); // sanity check

        const postHardforkChainIdCall = await provider.send("eth_call", [
          tx,
          `0x${(contractBlockNum + 2).toString(16)}`
        ]);
        assert.strictEqual(parseInt(postHardforkChainIdCall), originalChainId);

        await assert.rejects(
          provider.send("eth_call", [tx, `0x${contractBlockNum.toString(16)}`]),
          {
            message: "VM Exception while processing transaction: invalid opcode"
          }
        );
      });
    });

    describe("blocks and transactions", () => {
      const forkBlockNumber = 13636000;
      const londonHardfork = 12965000;
      let provider: EthereumProvider;
      const URL = "https://mainnet.infura.io/v3/" + process.env.INFURA_KEY;

      skipIfNoInfuraKey();

      before("configure provider", async () => {
        provider = await getProvider({
          wallet: {
            deterministic: true
          },
          fork: {
            url: URL,
            blockNumber: forkBlockNumber
          }
        });
      });

      it("should get blocks before the fork point", async () => {
        const preLondonBlock = londonHardfork - 100;
        const preBlock = await provider.request({
          method: "eth_getBlockByNumber",
          params: [`0x${preLondonBlock.toString(16)}`, true]
        });
        assert.strictEqual(preBlock.transactions.length, 189);

        // make sure blocks with type 2 transaction in them are be handled
        const postLondonBlock = 13635000; // has type 2 txs in it
        const postBlock = await provider.request({
          method: "eth_getBlockByNumber",
          params: [`0x${postLondonBlock.toString(16)}`, true]
        });
        assert.strictEqual(postBlock.transactions.length, 348);
      });

      it("should get a transaction before the fork point", async () => {
        const preTransaction = await provider.request({
          method: "eth_getTransactionByHash",
          params: [
            `0xfbb89203a2571a264e0ae75f1c04c055f11d654945d72fba31c03ac81476be7b`
          ]
        });
        assert.strictEqual(preTransaction.type, "0x2");
      });
    });
  });
});

describe("forking", function () {
  // sometimes the network connection seems to take a long time (+10 seconds)
  // I don't think this is something we can handle on our side so to avoid test
  // timeouts i've set these tests to a high value.
  this.timeout(30000);

  describe("network option", () => {
    const testData = {
      mainnet: {
        address: "0x00000000219ab540356cbb839cbe05303d7705fa",
        balance: "0x6d3c9dd798891c3455045",
        block: "0xcfd6e0"
      },
      goerli: {
        address: "0x9d525E28Fe5830eE92d7Aa799c4D21590567B595",
        balance: "0x81744abdb769a3b6dc08b",
        block: "0x595434"
      },
      görli: {
        address: "0x9d525E28Fe5830eE92d7Aa799c4D21590567B595",
        balance: "0x81744abdb769a3b6dc08b",
        block: "0x595434"
      },
      sepolia: {
        address: "0xd7d76c58b3a519e9fA6Cc4D22dC017259BC49F1E",
        balance: "0x52b7d2dcc80cd2e4000000",
        block: "0x1AD62D"
      }
    };
    let localProvider: EthereumProvider;

    skipIfNoInfuraKey();

    KNOWN_NETWORKS.forEach(network => {
      describe(network, () => {
        beforeEach("set up network provider", async () => {
          const provider = await startLocalChain(PORT, {
            network,
            disableCache: true
          });
          localProvider = provider.localProvider;
        });

        afterEach("tear down network provider", async () => {
          localProvider && (await localProvider.disconnect());
        });

        it(`should accept network`, async () => {
          const balance = await localProvider.request({
            method: "eth_getBalance",
            params: [testData[network].address, testData[network].block]
          });
          assert.strictEqual(balance, testData[network].balance);
        });
      });
    });
  });

  describe("shanghai withdrawals", () => {
    // We don't fetch the block directly from goerli here and just compare
    // the two responses with `deepStrictEqual` because the fields returned
    // by a node change over time. This can result in a passing test one
    // minute and failing the next.
    const expectedWithdrawalsRoot =
      "0x15f562646ecde763d5015bc12ee93ed00b0d76991002594840b3d45f38d498d4";
    const expectedWithdrawals = [
      {
        address: "0x8f0844fd51e31ff6bf5babe21dccf7328e19fd9f",
        amount: "0x1bcf80",
        index: "0x1a9eb6",
        validatorIndex: "0x3a986"
      },
      {
        address: "0x8f0844fd51e31ff6bf5babe21dccf7328e19fd9f",
        amount: "0x1c28a0",
        index: "0x1a9eb7",
        validatorIndex: "0x3a987"
      },
      {
        address: "0x8f0844fd51e31ff6bf5babe21dccf7328e19fd9f",
        amount: "0x1c95fc",
        index: "0x1a9eb8",
        validatorIndex: "0x3a988"
      },
      {
        address: "0x8f0844fd51e31ff6bf5babe21dccf7328e19fd9f",
        amount: "0x1c1166",
        index: "0x1a9eb9",
        validatorIndex: "0x3a989"
      },
      {
        address: "0x8f0844fd51e31ff6bf5babe21dccf7328e19fd9f",
        amount: "0x1c60d7",
        index: "0x1a9eba",
        validatorIndex: "0x3a98a"
      },
      {
        address: "0x8f0844fd51e31ff6bf5babe21dccf7328e19fd9f",
        amount: "0x1c1884",
        index: "0x1a9ebb",
        validatorIndex: "0x3a98b"
      },
      {
        address: "0x8f0844fd51e31ff6bf5babe21dccf7328e19fd9f",
        amount: "0x1bb7f4",
        index: "0x1a9ebc",
        validatorIndex: "0x3a98c"
      },
      {
        address: "0x8f0844fd51e31ff6bf5babe21dccf7328e19fd9f",
        amount: "0x1bde0f",
        index: "0x1a9ebd",
        validatorIndex: "0x3a98d"
      },
      {
        address: "0x8f0844fd51e31ff6bf5babe21dccf7328e19fd9f",
        amount: "0x1c2649",
        index: "0x1a9ebe",
        validatorIndex: "0x3a98e"
      },
      {
        address: "0x8f0844fd51e31ff6bf5babe21dccf7328e19fd9f",
        amount: "0x1bd422",
        index: "0x1a9ebf",
        validatorIndex: "0x3a98f"
      },
      {
        address: "0x8f0844fd51e31ff6bf5babe21dccf7328e19fd9f",
        amount: "0x1afb42",
        index: "0x1a9ec0",
        validatorIndex: "0x3a990"
      },
      {
        address: "0x8f0844fd51e31ff6bf5babe21dccf7328e19fd9f",
        amount: "0x1bc0ab",
        index: "0x1a9ec1",
        validatorIndex: "0x3a991"
      },
      {
        address: "0x8f0844fd51e31ff6bf5babe21dccf7328e19fd9f",
        amount: "0x1c4ceb",
        index: "0x1a9ec2",
        validatorIndex: "0x3a992"
      },
      {
        address: "0x8f0844fd51e31ff6bf5babe21dccf7328e19fd9f",
        amount: "0x1ccc3c",
        index: "0x1a9ec3",
        validatorIndex: "0x3a993"
      },
      {
        address: "0x8f0844fd51e31ff6bf5babe21dccf7328e19fd9f",
        amount: "0x1c4026",
        index: "0x1a9ec4",
        validatorIndex: "0x3a994"
      },
      {
        address: "0x8f0844fd51e31ff6bf5babe21dccf7328e19fd9f",
        amount: "0x1b7227",
        index: "0x1a9ec5",
        validatorIndex: "0x3a995"
      }
    ];

    // this test uses the `network: "goerli"` option, which requires an
    // infura key; when run our tests it must be provided as an environment
    // variable.
    skipIfNoInfuraKey();

    describe("shanghai", () => {
      let provider: EthereumProvider;
      const blockNumber = 8765432;
      afterEach(async () => {
        provider && (await provider.disconnect());
      });
      it("returns the withdrawals and withdrawalsRoot", async () => {
        provider = await getProvider({
          chain: { hardfork: "merge" },
          fork: { network: "goerli", blockNumber }
        });
        const block = await provider.send("eth_getBlockByNumber", [
          `0x${blockNumber.toString(16)}`,
          false
        ]);

        assert.deepStrictEqual(block.withdrawals, expectedWithdrawals);
        assert.strictEqual(block.withdrawalsRoot, expectedWithdrawalsRoot);
      });

      it("should still return withdrawals and withdrawalsRoot when the hardfork is before shanghai", async () => {
        // When the block happened shanghai was active, so just because it isn't
        // active now doesn't change the fact that it was before. This test
        // tests this.
        provider = await getProvider({
          // the blockNumber is after shanghai, but the hardfork is before:
          chain: { hardfork: "merge" },
          fork: { network: "goerli", blockNumber }
        });
        const block = await provider.send("eth_getBlockByNumber", [
          `0x${blockNumber.toString(16)}`,
          false
        ]);
        assert.deepStrictEqual(block.withdrawals, expectedWithdrawals);
        assert.strictEqual(block.withdrawalsRoot, expectedWithdrawalsRoot);
      });
    });
  });
});
