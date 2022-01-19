import getProvider from "../../helpers/getProvider";
import assert from "assert";

describe("api", () => {
  describe("eth", () => {
    describe("eager", () => {
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

      it("when in eager instamine mode, mines before returns in the tx hash", async () => {
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
              assert.strictEqual(typeof (r as any).error.data.result, "string");
              done();
            }
          );
        });
      });
    });
  });
});
