import getProvider from "../../helpers/getProvider";
import assert from "assert";

describe("api", () => {
  describe("eth", () => {
    describe("legacy", () => {
      it("when not in legacy mode, does not mine before returning the tx hash", async () => {
        const provider = await getProvider({
          miner: { legacyInstamine: false }
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

      it("when in legacy mode, mines before returns in the tx hash", async () => {
        const provider = await getProvider({
          miner: { legacyInstamine: true }
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
          miner: { legacyInstamine: true },
          chain: { vmErrorsOnRPCResponse: true }
        }).then(async provider => {
          const accounts = await provider.send("eth_accounts");

          provider.send(
            {
              jsonrpc: "2.0",
              id: "1",
              method: "eth_sendTransaction",
              params: [
                {
                  from: accounts[0],
                  to: accounts[1],
                  value: "0x76bc75e2d631000000"
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
