import getProvider from "../../helpers/getProvider";
import assert from "assert";
import { Quantity } from "@ganache/utils";
import EthereumProvider from "../../../src/provider";
import { TypedRpcTransaction } from "@ganache/ethereum-transaction/typings";

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

    describe("evm_addAccount", () => {
      let provider: EthereumProvider;
      const passphrase = "passphrase";
      before(async () => {
        provider = await getProvider();
      });

      it("should add an account to the personal namespace", async () => {
        const address = "0x742d35cc6634c0532925a3b844bc454e4438f44e";
        const tx: TypedRpcTransaction = { from: address };
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
        const tx: TypedRpcTransaction = { from: address };

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
