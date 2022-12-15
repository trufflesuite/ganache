import assert from "assert";
import {
  ecrecover,
  pubToAddress,
  fromSigned,
  hashPersonalMessage,
  fromRpcSig
} from "@ethereumjs/util";
import getProvider from "../../helpers/getProvider";
import { Data, Quantity } from "@ganache/utils";

describe("api", () => {
  describe("eth", () => {
    describe("sign", () => {
      let accounts;
      let provider;

      // Load account.
      before(async () => {
        // This account produces an edge case signature when it signs the hex-encoded buffer:
        // '0x07091653daf94aafce9acf09e22dbde1ddf77f740f9844ac1f0ab790334f0627'. (See Issue #190)
        const acc = {
          balance: "0x0",
          secretKey:
            "0xe6d66f02cd45a13982b99a5abf3deab1f67cf7be9fee62f0a072cb70896342e4"
        };
        provider = await getProvider({
          wallet: {
            accounts: [acc]
          }
        });
        accounts = await provider.send("eth_accounts");
      });

      it("should produce a signature whose signer can be recovered", async () => {
        const msg = Buffer.from("0xffffffffff");
        const msgHash = hashPersonalMessage(msg);

        const address = accounts[0];
        let sgn = await provider.send("eth_sign", [
          address,
          Data.toString(msg)
        ]);
        const { v, r, s } = fromRpcSig(sgn);

        const pub = ecrecover(msgHash, v, r, s);
        const addr = fromSigned(pubToAddress(pub));
        const strAddr = Data.toString(`0x${addr.toString(16)}`, 20);
        assert.strictEqual(strAddr, accounts[0].toLowerCase());
      });

      it("should work if ecsign produces 'r' or 's' components that start with 0", async () => {
        // This message produces a zero prefixed 'r' component when signed by
        // ecsign w/ the account set in this test's 'before' block.
        const msgHex =
          "0x07091653daf94aafce9acf09e22dbde1ddf77f740f9844ac1f0ab790334f0627";
        const edgeCaseMsg = Data.toBuffer(msgHex);
        const msgHash = hashPersonalMessage(edgeCaseMsg);

        let sgn = await provider.send("eth_sign", [accounts[0], msgHex]);

        const { v, r, s } = fromRpcSig(sgn);
        const pub = ecrecover(msgHash, v, r, s);
        const addr = fromSigned(pubToAddress(pub));
        const strAddr = Data.toString(Quantity.toBuffer(addr), 20);
        assert.strictEqual(strAddr, accounts[0].toLowerCase());
      });

      after("shutdown", async () => {
        provider && (await provider.disconnect());
      });
    });
  });
});
