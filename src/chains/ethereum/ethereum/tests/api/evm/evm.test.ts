import getProvider from "../../helpers/getProvider";
import assert from "assert";
import { Data, Quantity } from "@ganache/utils";
import { EthereumProvider } from "../../../src/provider";
import { Transaction } from "@ganache/ethereum-transaction";
import memdown from "memdown";
import { EthereumProviderOptions } from "@ganache/ethereum-options/typings";

function between(x: number, min: number, max: number) {
  return x >= min && x <= max;
}

describe("api", () => {
  describe("evm", () => {
    describe("evm_setTime", () => {
      it("should set the time correctly when difference is greater than 2**31", async () => {
        // this test is here to prevent a dev from "optimizing" rounding to use
        // bitwise tricks since those won't work on numbers greater than 2**31.

        const provider = await getProvider();
        const bin32 = 2 ** 31;
        const now = Date.now();
        // fast forward time by bin32, plus 2 seconds, in case testing is slow
        const newTime = bin32 + now + 2;

        const timeAdjustment = await provider.send("evm_setTime", [newTime]);

        // it should return `newTime - now`, floored to the nearest second
        const baseLineOffset = Math.floor((newTime - now) / 1000);
        assert(between(timeAdjustment, baseLineOffset - 2, baseLineOffset + 2));
      });

      it("should set the time correctly when given as a hex string", async () => {
        const provider = await getProvider();
        const now = Date.now();
        // fast forward time by 10 seconds (plus 2 seconds in case testing is slow)
        const newTime = now + 10000 + 2000;

        const timeAdjustment = await provider.send("evm_setTime", [
          `0x${newTime.toString(16)}`
        ]);

        // it should return `newTime - now`, floored to the nearest second
        const baseLineOffset = Math.floor((newTime - now) / 1000);
        assert(between(timeAdjustment, baseLineOffset - 2, baseLineOffset + 2));
      });

      it("should set the time correctly when given as a Date", async () => {
        const provider = await getProvider();
        const now = Date.now();
        // fast forward time by 10 seconds (plus 2 seconds in case testing is slow), then create a new Date object
        const newTime = new Date(now + 10000 + 2000);

        const timeAdjustment = await provider.send("evm_setTime", [newTime]);

        // it should return `newTime.getTime() - now`, floored to the nearest second
        const baseLineOffset = Math.floor((newTime.getTime() - now) / 1000);
        assert(between(timeAdjustment, baseLineOffset - 2, baseLineOffset + 2));
      });
    });

    describe("evm_increaseTime", () => {
      it("should return the `timeAdjustment` value via `evm_increaseTime` when provided as a number", async () => {
        const provider = await getProvider();
        const seconds = 10;
        const timeAdjustment = await provider.send("evm_increaseTime", [
          seconds
        ]);
        assert.strictEqual(timeAdjustment, seconds);
      });

      it("should return the `timeAdjustment` value via `evm_increaseTime` when provided as hex string", async () => {
        const provider = await getProvider();
        const seconds = 10;
        const timeAdjustment = await provider.send("evm_increaseTime", [
          `0x${seconds.toString(16)}`
        ]);
        assert.strictEqual(timeAdjustment, seconds);
      });
    });

    describe("evm_mine", () => {
      const providerOptions: EthereumProviderOptions[] = [
        { miner: { instamine: "eager" } },
        { miner: { instamine: "strict" } }
      ];
      providerOptions.forEach(option => {
        return describe(`in ${option.miner.instamine} instamine mode`, () => {
          it("should mine `n` blocks on demand", async () => {
            const provider = await getProvider(option);
            const initialBlock = parseInt(
              await provider.send("eth_blockNumber")
            );
            await provider.request({
              method: "evm_mine",
              params: [{ blocks: 5 }]
            });
            const currentBlock = parseInt(
              await provider.send("eth_blockNumber")
            );
            assert.strictEqual(currentBlock, initialBlock + 5);
          });

          it("should mine a block on demand", async () => {
            const provider = await getProvider(option);
            const initialBlock = parseInt(
              await provider.send("eth_blockNumber")
            );
            await provider.send("evm_mine");
            const currentBlock = parseInt(
              await provider.send("eth_blockNumber")
            );
            assert.strictEqual(currentBlock, initialBlock + 1);
          });

          it("should mine a block on demand at the specified timestamp", async () => {
            const startDate = new Date(2019, 3, 15);
            const miningTimestamp = Math.floor(
              new Date(2020, 3, 15).getTime() / 1000
            );
            const provider = await getProvider({
              chain: { time: startDate },
              ...option
            });
            await provider.send("evm_mine", [miningTimestamp]);
            const currentBlock = await provider.send("eth_getBlockByNumber", [
              "latest"
            ]);
            assert.strictEqual(
              parseInt(currentBlock.timestamp),
              miningTimestamp
            );
          });

          it("should mine a subsequent block at the correct time after specifying a timestamp for a previous block", async () => {
            const startDate = new Date(2019, 3, 15);
            const miningTimestamp = Math.floor(
              new Date(2020, 3, 15).getTime() / 1000
            );

            const evmMineArgumentPermutations = [
              { timestamp: miningTimestamp, blocks: 1 },
              { timestamp: miningTimestamp },
              miningTimestamp
            ];

            for (const evmMineArg of evmMineArgumentPermutations) {
              const provider = await getProvider({
                chain: { time: startDate },
                ...option
              });

              await provider.send("evm_mine", [<any>evmMineArg]);
              const { timestamp: specificBlockTime } = await provider.send(
                "eth_getBlockByNumber",
                ["latest"]
              );

              assert.equal(specificBlockTime, miningTimestamp);

              await provider.send("evm_mine");
              const { timestamp: subsequentBlockTime } = await provider.send(
                "eth_getBlockByNumber",
                ["latest"]
              );
              const subsequentBlockTimestamp =
                Quantity.toNumber(subsequentBlockTime);

              // add 2 seconds in case testing is slow
              assert(
                between(
                  subsequentBlockTimestamp,
                  miningTimestamp,
                  miningTimestamp + 2
                )
              );
            }
          });

          it("should mine a block even when mining is stopped", async () => {
            const provider = await getProvider(option);
            const initialBlock = parseInt(
              await provider.send("eth_blockNumber")
            );
            await provider.send("miner_stop");
            await provider.send("evm_mine");
            const currentBlock = parseInt(
              await provider.send("eth_blockNumber")
            );
            assert.strictEqual(currentBlock, initialBlock + 1);
          });

          it("should mine a block when in interval mode", async () => {
            const provider = await getProvider({
              miner: { blockTime: 1000, ...option.miner }
            });
            const initialBlock = parseInt(
              await provider.send("eth_blockNumber")
            );
            await provider.send("evm_mine");
            const currentBlock = parseInt(
              await provider.send("eth_blockNumber")
            );
            assert.strictEqual(currentBlock, initialBlock + 1);
          });

          it("should mine a block when in interval mode even when mining is stopped", async () => {
            const provider = await getProvider({
              miner: { blockTime: 1000, ...option.miner }
            });
            const initialBlock = parseInt(
              await provider.send("eth_blockNumber")
            );
            await provider.send("miner_stop");
            await provider.send("evm_mine");
            const currentBlock = parseInt(
              await provider.send("eth_blockNumber")
            );
            assert.strictEqual(currentBlock, initialBlock + 1);
          });

          it("should save the block before returning", async () => {
            // slow down memdown's _batch function to consistently reproduce a past
            // race condition where a block was mined and returned by evm_mine
            // before it actually saved to the database. for history, the race
            // condition issue is documented here:
            // https://github.com/trufflesuite/ganache/issues/3060
            const db = memdown();
            let customBatchCalled = false;
            db._batch = (...args) => {
              setTimeout(() => {
                customBatchCalled = true;
                Reflect.apply(memdown.prototype._batch, db, args);
              }, 20);
            };

            const options = { database: { db }, ...option };
            const provider = await getProvider(options);
            await provider.request({ method: "evm_mine", params: [{}] });

            const block = await provider.request({
              method: "eth_getBlockByNumber",
              params: [`0x1`]
            });
            assert(
              block,
              `the block doesn't exist. evm_mine returned before saving the block`
            );
            // make sure our patch works
            assert(customBatchCalled);
          });
        });
      });
    });

    describe("evm_setAccountNonce", () => {
      it("should set the nonce forward", async () => {
        const provider = await getProvider();
        const [account] = await provider.send("eth_accounts");
        const newCount = Quantity.from(1000);
        const initialCount = parseInt(
          await provider.send("eth_getTransactionCount", [account])
        );
        assert.strictEqual(initialCount, 0);
        const status = await provider.send("evm_setAccountNonce", [
          account,
          newCount.toString()
        ]);
        assert.strictEqual(status, true);
        const afterCount = parseInt(
          await provider.send("eth_getTransactionCount", [account])
        );
        assert.strictEqual(afterCount, newCount.toNumber());
      });
    });

    describe("evm_setAccountBalance", () => {
      it("should set the balance", async () => {
        const provider = await getProvider();
        const [account] = await provider.send("eth_accounts");
        const newBalance = Quantity.from(1000);
        const initialBalance = parseInt(
          await provider.send("eth_getBalance", [account])
        );
        assert.strictEqual(initialBalance, 1e21);
        const status = await provider.send("evm_setAccountBalance", [
          account,
          newBalance.toString()
        ]);
        assert.strictEqual(status, true);
        const afterBalance = parseInt(
          await provider.send("eth_getBalance", [account])
        );
        assert.strictEqual(afterBalance, newBalance.toNumber());
      });
    });

    describe("evm_setAccountCode", () => {
      it("should set code and reset after", async () => {
        const provider = await getProvider();
        const [account] = await provider.send("eth_accounts");
        const newCode = Data.from("0xbaddad42");
        const initialCode = await provider.send("eth_getCode", [account]);
        assert.strictEqual(initialCode, "0x");
        const setStatus = await provider.send("evm_setAccountCode", [
          account,
          newCode.toString()
        ]);
        assert.strictEqual(setStatus, true);
        const afterCode = await provider.send("eth_getCode", [account]);
        assert.strictEqual(afterCode, newCode.toString());

        // Check that the code can be set to 0x
        const emptyCode = Data.from("0x");
        const resetStatus = await provider.send("evm_setAccountCode", [
          account,
          emptyCode.toString()
        ]);
        assert.strictEqual(resetStatus, true);
        const resetCode = await provider.send("eth_getCode", [account]);
        assert.strictEqual(resetCode, emptyCode.toString());
      });
    });

    describe("evm_setAccountStorageAt", () => {
      it("should set storage slot and delete after", async () => {
        const provider = await getProvider();
        const [account] = await provider.send("eth_accounts");
        const slot =
          "0x0000000000000000000000000000000000000000000000000000000000000005";
        const newStorage = Data.from("0xbaddad42");
        const initialStorage = await provider.send("eth_getStorageAt", [
          account,
          slot
        ]);
        assert.strictEqual(initialStorage, "0x");
        const setStatus = await provider.send("evm_setAccountStorageAt", [
          account,
          slot,
          newStorage.toString()
        ]);
        assert.strictEqual(setStatus, true);
        const afterCode = await provider.send("eth_getStorageAt", [
          account,
          slot
        ]);
        assert.strictEqual(afterCode, newStorage.toString());

        // Check that the storage can be deleted
        const emptyStorage = Data.from("0x");
        const deletedStatus = await provider.send("evm_setAccountStorageAt", [
          account,
          slot,
          emptyStorage.toString()
        ]);
        assert.strictEqual(deletedStatus, true);
        const deletedStorage = await provider.send("eth_getStorageAt", [
          account,
          slot
        ]);
        assert.strictEqual(deletedStorage, emptyStorage.toString());
      });
    });

    describe("evm_addAccount", () => {
      let provider: EthereumProvider;
      const passphrase = "passphrase";
      before(async () => {
        provider = await getProvider();
      });

      it("should add an account to the personal namespace", async () => {
        const address = "0x742d35cc6634c0532925a3b844bc454e4438f44e";
        // fund the account
        const [from] = await provider.request({
          method: "eth_accounts",
          params: []
        });
        await provider.send("eth_subscribe", ["newHeads"]);
        await provider.send("eth_sendTransaction", [
          { from, to: address, value: "0xffffffffffffffff" }
        ]);
        await provider.once("message");
        const tx: Transaction = { from: address };
        // account is unknown on startup
        await assert.rejects(provider.send("eth_sendTransaction", [tx]), {
          message: "sender account not recognized"
        });
        const result = await provider.send("evm_addAccount", [
          address,
          passphrase
        ]);
        assert.strictEqual(result, true);

        // account is known but locked
        await assert.rejects(provider.send("eth_sendTransaction", [tx]), {
          message: "authentication needed: passphrase or unlock"
        });

        // account is included in eth_accounts
        assert((await provider.send("eth_accounts", [])).includes(address));

        // account is included in personal_listAccounts
        assert(
          (await provider.send("personal_listAccounts", [])).includes(address)
        );

        // we're added to the personal namespace so we can unlock
        const unlocked = await provider.send("personal_unlockAccount", [
          address,
          passphrase
        ]);
        assert.strictEqual(unlocked, true);

        // now we can successfully send that tx
        await assert.doesNotReject(provider.send("eth_sendTransaction", [tx]));
      });

      it("should not add an account already known to the personal namespace", async () => {
        const [account] = await provider.send("eth_accounts");
        const result = await provider.send("evm_addAccount", [
          account,
          passphrase
        ]);
        // cannot add account
        assert.strictEqual(result, false);
      });
    });

    describe("evm_removeAccount", () => {
      let provider: EthereumProvider;
      const passphrase = "passphrase";
      before(async () => {
        provider = await getProvider({ wallet: { passphrase: passphrase } });
      });

      it("should remove an account from the personal namespace", async () => {
        const [address] = await provider.send("eth_accounts");
        const tx: Transaction = { from: address };

        // account is known on startup
        await assert.doesNotReject(provider.send("eth_sendTransaction", [tx]));

        const result = await provider.send("evm_removeAccount", [
          address,
          passphrase
        ]);
        assert.strictEqual(result, true);

        // account is no longer known
        await assert.rejects(provider.send("eth_sendTransaction", [tx]), {
          message: "sender account not recognized"
        });
      });

      it("should not remove an account that isn't known to the personal namespace", async () => {
        const address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
        const result = await provider.send("evm_removeAccount", [
          address,
          passphrase
        ]);
        // cannot remove account
        assert.strictEqual(result, false);
      });
    });
  });
});
