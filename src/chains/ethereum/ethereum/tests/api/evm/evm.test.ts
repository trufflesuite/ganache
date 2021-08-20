import getProvider from "../../helpers/getProvider";
import assert from "assert";
import { Quantity } from "@ganache/utils";
import EthereumProvider from "../../../src/provider";

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
      it("should mine `n` blocks on demand", async () => {
        const provider = await getProvider();
        const initialBlock = parseInt(await provider.send("eth_blockNumber"));
        await provider.request({ method: "evm_mine", params: [{ blocks: 5 }] });
        const currentBlock = parseInt(await provider.send("eth_blockNumber"));
        assert.strictEqual(currentBlock, initialBlock + 5);
      });

      it("should mine a block on demand", async () => {
        const provider = await getProvider();
        const initialBlock = parseInt(await provider.send("eth_blockNumber"));
        await provider.send("evm_mine");
        const currentBlock = parseInt(await provider.send("eth_blockNumber"));
        assert.strictEqual(currentBlock, initialBlock + 1);
      });

      it("should mine a block on demand at the specified timestamp", async () => {
        const startDate = new Date(2019, 3, 15);
        const miningTimestamp = Math.floor(
          new Date(2020, 3, 15).getTime() / 1000
        );
        const provider = await getProvider({ chain: { time: startDate } });
        await provider.send("evm_mine", [miningTimestamp]);
        const currentBlock = await provider.send("eth_getBlockByNumber", [
          "latest"
        ]);
        assert.strictEqual(parseInt(currentBlock.timestamp), miningTimestamp);
      });

      it("should mine a block even when mining is stopped", async () => {
        const provider = await getProvider();
        const initialBlock = parseInt(await provider.send("eth_blockNumber"));
        await provider.send("miner_stop");
        await provider.send("evm_mine");
        const currentBlock = parseInt(await provider.send("eth_blockNumber"));
        assert.strictEqual(currentBlock, initialBlock + 1);
      });

      it("should mine a block when in interval mode", async () => {
        const provider = await getProvider({ miner: { blockTime: 1000 } });
        const initialBlock = parseInt(await provider.send("eth_blockNumber"));
        await provider.send("evm_mine");
        const currentBlock = parseInt(await provider.send("eth_blockNumber"));
        assert.strictEqual(currentBlock, initialBlock + 1);
      });

      it("should mine a block when in interval mode even when mining is stopped", async () => {
        const provider = await getProvider({ miner: { blockTime: 1000 } });
        const initialBlock = parseInt(await provider.send("eth_blockNumber"));
        await provider.send("miner_stop");
        await provider.send("evm_mine");
        const currentBlock = parseInt(await provider.send("eth_blockNumber"));
        assert.strictEqual(currentBlock, initialBlock + 1);
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

    describe("evm_lockUnknownAccount/evm_unlockUnknownAccount", () => {
      let accounts: string[], provider: EthereumProvider;
      before(async () => {
        provider = await getProvider();
        accounts = await provider.send("eth_accounts");
      });

      it("should unlock any account after server has been started", async () => {
        const address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
        const result1 = await provider.send("evm_unlockUnknownAccount", [
          address
        ]);
        assert.strictEqual(result1, true);

        // should return `false` if account was already locked
        const result2 = await provider.send("evm_unlockUnknownAccount", [
          address
        ]);
        assert.strictEqual(result2, false);
      });

      it("should not unlock any locked personal account", async () => {
        const [address] = accounts;
        await provider.send("personal_lockAccount", [address]);
        try {
          await assert.rejects(
            provider.send("evm_unlockUnknownAccount", [address]),
            {
              message: "cannot unlock known/personal account"
            }
          );
        } finally {
          // unlock the account
          await provider.send("personal_unlockAccount", [address, "", 0]);
        }
      });

      it("should lock any unlocked unknown account via evm_lockUnknownAccount", async () => {
        const address = "0x842d35Cc6634C0532925a3b844Bc454e4438f44f";
        const unlockResult = await provider.send("evm_unlockUnknownAccount", [
          address
        ]);
        assert.strictEqual(unlockResult, true);

        const lockResult1 = await provider.send("evm_lockUnknownAccount", [
          address
        ]);
        assert.strictEqual(lockResult1, true);

        // bonus: also make sure we return false when the account is already locked:
        const lockResult2 = await provider.send("evm_lockUnknownAccount", [
          address
        ]);
        assert.strictEqual(lockResult2, false);
      });

      it("should not lock a known account via evm_lockUnknownAccount", async () => {
        await assert.rejects(
          provider.send("evm_lockUnknownAccount", [accounts[0]]),
          {
            message: "cannot lock known/personal account"
          }
        );
      });

      it("should not lock a personal account via evm_lockUnknownAccount", async () => {
        // create a new personal account
        const address = await provider.send("personal_newAccount", [
          "password"
        ]);

        // then explicitly unlock it
        const result = await provider.send("personal_unlockAccount", [
          address,
          "password",
          0
        ]);
        assert.strictEqual(result, true);

        // then try to lock it via evm_lockUnknownAccount
        await assert.rejects(
          provider.send("evm_lockUnknownAccount", [address]),
          {
            message: "cannot lock known/personal account"
          }
        );
      });

      it("should return `false` upon lock if account isn't locked (unknown account)", async () => {
        const address = "0x942d35Cc6634C0532925a3b844Bc454e4438f450";
        const result = await provider.send("evm_lockUnknownAccount", [address]);
        assert.strictEqual(result, false);
      });
    });
  });
});
