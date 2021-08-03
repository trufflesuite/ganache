import ganache from "../../../../../packages/core";
import assert from "assert";
import EthereumProvider from "../../src/provider";
import Server from "../../../../../packages/core/lib/src/server";
import { Quantity, WEI } from "@ganache/utils";
import {
  logging,
  startLocalChain,
  updateRemotesAccountsBalances,
  updateRemotesAccountNonces,
  range
} from "./helpers";
import compile from "../helpers/compile";
import path from "path";

describe("forking", () => {
  const PORT = 9999;
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
    remoteProvider = (remoteServer.provider as unknown) as EthereumProvider;
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

  describe("initial state", () => {
    it("should get the Network ID of the forked chain", async () => {
      const { localProvider } = await startLocalChain(PORT);

      const [remoteNetworkId, localNetworkId] = await Promise.all(
        [remoteProvider, localProvider].map(p => p.send("net_version", []))
      );
      assert.strictEqual(localNetworkId, remoteNetworkId);
      assert.strictEqual(remoteNetworkId, NETWORK_ID.toString());
    });

    describe("block number", () => {
      let localProvider: EthereumProvider;
      beforeEach("start local chain", async () => {
        ({ localProvider } = await startLocalChain(PORT));
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
        ({ localProvider } = await startLocalChain(PORT));
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
        ({ localProvider, localAccounts } = await startLocalChain(PORT));
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

    async function getBlockRanges(provider: EthereumProvider) {
      // our local chain starts at `localBlockNumberStart`.
      const blockNum = parseInt(await provider.send("eth_blockNumber", []), 16);
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
          assert.strictEqual(parseInt(value0, 16), 0);

          const value1 = await get("value1", blockNum);
          assert.strictEqual(parseInt(value1, 16), 2);

          const value2 = await get("value2", blockNum);
          assert.strictEqual(parseInt(value2, 16), 1);

          const value3 = await get("value3", blockNum);
          assert.strictEqual(parseInt(value3, 16), 0);

          const value4 = await get("value4", blockNum);
          assert.strictEqual(parseInt(value4, 16), 1);
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
      const contract = compile(
        path.join(__dirname, "contracts", "Forking.sol")
      );
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
      ({ contractAddress } = deploymentTxReceipt);
      contractBlockNum = parseInt(deploymentTxReceipt.blockNumber, 16);
      methods = contract.contract.evm.methodIdentifiers;

      contractCode = await remoteProvider.send("eth_getCode", [
        contractAddress
      ]);
    });

    it("should fetch contract code from the remote chain via the local chain", async () => {
      const { localProvider } = await startLocalChain(PORT);
      const {
        blockNumbersWithCode,
        blockNumbersWithoutCode
      } = await getBlockRanges(localProvider);

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
      const { localProvider } = await startLocalChain(PORT);
      const {
        blockNum,
        blockNumbersWithCode,
        blockNumbersWithoutCode
      } = await getBlockRanges(localProvider);

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
      const { localProvider } = await startLocalChain(PORT);
      const {
        blockNum,
        blockNumbersWithCode,
        blockNumbersWithoutCode
      } = await getBlockRanges(localProvider);

      function set(key: number, value: number) {
        const encodedKey = Quantity.from(key)
          .toBuffer()
          .toString("hex")
          .padStart(64, "0");
        const encodedValue = Quantity.from(value)
          .toBuffer()
          .toString("hex")
          .padStart(64, "0");

        return localProvider.send("eth_sendTransaction", [
          {
            from: remoteAccounts[0],
            to: contractAddress,
            data: `0x${
              methods[`setValueFor(uint8,uint256)`]
            }${encodedKey}${encodedValue}`,
            gas: `0x${(3141592).toString(16)}`
          }
        ]);
      }

      const _get = (value: string, blockNum: number) =>
        get(localProvider, value, blockNum);

      await setAllValuesTo(localProvider, 9, set);

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
      await setAllValuesTo(localProvider, 0, set);

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
      await setAllValuesTo(localProvider, 11, set);

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
  });
});
