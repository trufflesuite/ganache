import getProvider from "../../helpers/getProvider";
import assert from "assert";
import { Logger } from "@ganache/utils";

describe("api", () => {
  describe("eth", () => {
    describe("instamine modes (eager/strict)", () => {
      describe("strict", () => {
        it("when in strict instamine mode, does not mine before returning the tx hash", async () => {
          const provider = await getProvider({
            miner: { instamine: "strict" }
          });
          const accounts = await provider.send("eth_accounts");

          const hash = await provider.send("eth_sendTransaction", [
            {
              from: accounts[0],
              to: accounts[1],
              value: "0x1"
            }
          ]);
          const receipt = await provider.send("eth_getTransactionReceipt", [
            hash
          ]);
          assert.strictEqual(receipt, null);
        });
      });

      describe("eager", () => {
        it("mines before returning the tx hash", async () => {
          const provider = await getProvider({
            miner: { instamine: "eager" }
          });
          const accounts = await provider.send("eth_accounts");

          const hash = await provider.send("eth_sendTransaction", [
            {
              from: accounts[0],
              to: accounts[1],
              value: "0x1"
            }
          ]);
          const receipt = await provider.send("eth_getTransactionReceipt", [
            hash
          ]);
          assert.notStrictEqual(receipt, null);
        });

        it("log a message about future-nonce transactions in eager mode", async () => {
          let logger: Logger;
          const logPromise = new Promise<boolean>(resolve => {
            logger = {
              log: (msg: string) => {
                const regex =
                  /Transaction "0x[a-zA-z0-9]{64}" has a too-high nonce; this transaction has been added to the pool, and will be processed when its nonce is reached\. See https:\/\/github.com\/trufflesuite\/ganache\/issues\/4165 for more information\./;
                if (regex.test(msg)) resolve(true);
              }
            };
          });

          const provider = await getProvider({
            logging: { logger },
            miner: { instamine: "eager" },
            chain: { vmErrorsOnRPCResponse: true }
          });
          const [from, to] = await provider.send("eth_accounts");
          const futureNonceTx = { from, to, nonce: "0x1" };
          const futureNonceProm = provider.send("eth_sendTransaction", [
            futureNonceTx
          ]);

          // send a transaction to fill the nonce gap
          provider.send("eth_sendTransaction", [{ from, to }]); // we don't await this on purpose.

          const result = await Promise.race([futureNonceProm, logPromise]);
          // `logPromise` should resolve before the the hash gets returned
          // (logPromise returns true)
          assert.strictEqual(result, true);

          // now our nonce gap is filled so the original tx is mined
          const receipt = await provider.send("eth_getTransactionReceipt", [
            await futureNonceProm
          ]);
          assert.notStrictEqual(receipt, null);
        });

        it("handles transaction balance errors, callback style", done => {
          getProvider({
            miner: { instamine: "eager" },
            chain: { vmErrorsOnRPCResponse: true }
          }).then(async provider => {
            const [from, to] = await provider.send("eth_accounts");
            const balance = parseInt(
              await provider.send("eth_getBalance", [from]),
              16
            );
            const gasCost = 99967968750001;
            // send a transaction that will spend some of the balance
            provider.request({
              method: "eth_sendTransaction",
              params: [
                {
                  from,
                  to
                }
              ]
            });

            // send another transaction while the previous transaction is still
            // pending. this transaction appears to have enough balance to run,
            // so the transaction pool will accept it, but when it runs in the VM
            // it won't have enough balance to run.
            provider.send(
              {
                jsonrpc: "2.0",
                id: "1",
                method: "eth_sendTransaction",
                params: [
                  {
                    from,
                    to,
                    value: `0x${(balance - gasCost).toString(16)}`
                  }
                ]
              },
              (e, r) => {
                assert(
                  e.message.includes(
                    "sender doesn't have enough funds to send tx"
                  )
                );
                assert.strictEqual(e.message, (r as any).error.message);
                assert.strictEqual((r as any).error.code, -32000);
                assert.strictEqual(
                  typeof (r as any).error.data.result,
                  "string"
                );
                done();
              }
            );
          });
        });
      });
    });
  });
});
