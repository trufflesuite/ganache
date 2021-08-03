import assert from "assert";
import getProvider from "../../helpers/getProvider";
import { Quantity } from "@ganache/utils";
import EthereumProvider from "../../../src/provider";

describe("api", () => {
  describe("personal", () => {
    describe("listAccounts", () => {
      it("matches eth_accounts", async () => {
        const provider = await getProvider({ wallet: { seed: "temet nosce" } });
        const accounts = await provider.send("eth_accounts");
        const personalAccounts = await provider.send("personal_listAccounts");
        assert.deepStrictEqual(personalAccounts, accounts);
      });
    });

    async function testLockedAccountWithPassphraseViaEth_SendTransaction(
      provider: EthereumProvider,
      newAccount: string,
      passphrase: string
    ) {
      const transaction = {
        from: newAccount,
        to: newAccount,
        gasLimit: `0x${(21000).toString(16)}`,
        gasPrice: "0x0",
        value: "0x0",
        nonce: "0x0"
      };

      // make sure we can't use the account via eth_sendTransaction
      await assert.rejects(
        provider.send("eth_sendTransaction", [transaction]),
        {
          message: "authentication needed: password or unlock"
        },
        "eth_sendTransaction should have rejected due to locked from account without its passphrase"
      );

      // unlock the account indefinitely
      const unlocked = await provider.send("personal_unlockAccount", [
        newAccount,
        passphrase,
        0
      ]);
      assert.strictEqual(unlocked, true);

      await provider.send("eth_subscribe", ["newHeads"]);

      // send a normal transaction
      const transactionHash = await provider.send("eth_sendTransaction", [
        transaction
      ]);
      await provider.once("message");

      // ensure sure it worked
      const receipt = await provider.send("eth_getTransactionReceipt", [
        transactionHash
      ]);
      assert.strictEqual(
        receipt.status,
        "0x1",
        "Transaction failed when it should have succeeded"
      );

      // lock the account
      const accountLocked = await provider.send("personal_lockAccount", [
        newAccount
      ]);
      assert.strictEqual(accountLocked, true);

      // make sure it is locked
      await assert.rejects(
        provider.send("eth_sendTransaction", [
          Object.assign({}, transaction, { nonce: 1 })
        ]),
        {
          message: "authentication needed: password or unlock"
        },
        "personal_lockAccount didn't work"
      );
    }

    async function testLockedAccountWithPassphraseViaPersonal_SendTransaction(
      provider: EthereumProvider,
      newAccount: string,
      passphrase: string
    ) {
      const transaction = {
        from: newAccount,
        to: newAccount,
        gasLimit: `0x${(21000).toString(16)}`,
        gasPrice: "0x0",
        value: "0x0",
        nonce: "0x0"
      };

      // make sure we can't use the account via personal_sendTransaction and no passphrase
      await assert.rejects(
        provider.send("personal_sendTransaction", [transaction, undefined]),
        {
          message: "could not decrypt key with given password"
        },
        "personal_sendTransaction should have rejected due to locked from account without its passphrase"
      );

      // make sure we can't use the account with bad passphrases
      const invalidPassphrases = [
        "this is not my passphrase",
        null,
        undefined,
        Buffer.allocUnsafe(0),
        1,
        0,
        Infinity,
        NaN
      ];
      await Promise.all(
        invalidPassphrases.map(invalidPassphrase => {
          return assert.rejects(
            provider.send("personal_sendTransaction", [
              transaction,
              invalidPassphrase as any
            ]),
            {
              message: "could not decrypt key with given password"
            },
            "Transaction should have rejected due to locked from account with wrong passphrase"
          );
        })
      );

      // use personal_sendTransaction with the valid passphrase
      await provider.send("eth_subscribe", ["newHeads"]);
      const transactionHashPromise = provider.send("personal_sendTransaction", [
        transaction,
        passphrase
      ]);
      const msgPromise = transactionHashPromise.then(() =>
        provider.once("message")
      );

      await assert.rejects(
        provider.send("eth_sendTransaction", [
          Object.assign({}, transaction, { nonce: 1 })
        ]),
        {
          message: "authentication needed: password or unlock"
        },
        "personal_sendTransaction should not unlock the while transaction is bring processed"
      );

      const transactionHash = await transactionHashPromise;
      await msgPromise;

      const receipt = await provider.send("eth_getTransactionReceipt", [
        transactionHash
      ]);
      assert.strictEqual(
        receipt.status,
        "0x1",
        "Transaction failed when it should have succeeded"
      );

      // ensure the account is still locked
      await assert.rejects(
        provider.send("eth_sendTransaction", [
          Object.assign({}, transaction, { nonce: 1 })
        ]),
        {
          message: "authentication needed: password or unlock"
        },
        "personal_sendTransaction should still be locked the after the transaction is processed"
      );
    }

    describe("newAccount", () => {
      it("generates deterministic accounts", async () => {
        const controlProvider = await getProvider();
        const provider = await getProvider();
        const newAccount = await provider.send("personal_newAccount", [""]);
        const controlAccount = await controlProvider.send(
          "personal_newAccount",
          [""]
        );
        assert.strictEqual(newAccount, controlAccount);
      });

      it("generates different accounts based on the `seed` option", async () => {
        const controlProvider = await getProvider();
        const provider = await getProvider({ wallet: { seed: "temet nosce" } });
        const newAccount = await provider.send("personal_newAccount", [""]);
        const controlAccount = await controlProvider.send(
          "personal_newAccount",
          [""]
        );
        assert.notStrictEqual(newAccount, controlAccount);
      });

      it("generates different accounts based on the `mnemonic` option", async () => {
        const controlProvider = await getProvider();
        const provider = await getProvider({
          wallet: { mnemonic: "sweet treat" }
        });
        const newAccount = await provider.send("personal_newAccount", [""]);
        const controlAccount = await controlProvider.send(
          "personal_newAccount",
          [""]
        );
        assert.notStrictEqual(newAccount, controlAccount);
      });

      it("generates different accounts on successive calls", async () => {
        const provider = await getProvider();
        const firstNewAccount = await provider.send("personal_newAccount", [
          ""
        ]);
        const secondNewAccount = await provider.send("personal_newAccount", [
          ""
        ]);
        assert.notStrictEqual(firstNewAccount, secondNewAccount);
      });

      it("generates different accounts on successive calls based on the seed", async () => {
        const controlProvider = await getProvider();
        const provider = await getProvider({ wallet: { seed: "temet nosce" } });
        const firstNewAccount = await provider.send("personal_newAccount", [
          ""
        ]);
        const secondNewAccount = await provider.send("personal_newAccount", [
          ""
        ]);

        await provider.send("personal_newAccount", [""]);
        const controlSecondNewAccount = await controlProvider.send(
          "personal_newAccount",
          [""]
        );

        assert.notStrictEqual(
          firstNewAccount,
          secondNewAccount,
          "First and second generated accounts are the same when they shouldn't be"
        );
        assert.notStrictEqual(
          secondNewAccount,
          controlSecondNewAccount,
          "Second account is identical to control's second account when it shouldn't be"
        );
      });

      describe("personal_unlockAccount ➡ eth_sendTransaction ➡ personal_lockAccount", () => {
        it("generates locked accounts with passphrase", async () => {
          const provider = await getProvider({ miner: { gasPrice: 0 } });
          const passphrase = "this is my passphrase";
          // generate an account
          const newAccount = await provider.send("personal_newAccount", [
            passphrase
          ]);

          testLockedAccountWithPassphraseViaEth_SendTransaction(
            provider,
            newAccount,
            passphrase
          );
        });
      });

      describe("personal_sendTransaction", () => {
        it("generates locked accounts with passphrase", async () => {
          const provider = await getProvider({ miner: { gasPrice: 0 } });
          const passphrase = "this is my passphrase";
          // generate an account
          const newAccount = await provider.send("personal_newAccount", [
            passphrase
          ]);

          testLockedAccountWithPassphraseViaPersonal_SendTransaction(
            provider,
            newAccount,
            passphrase
          );
        });
      });
    });

    describe("personal_importRawKey", () => {
      const secretKey =
        "0x0123456789012345678901234567890123456789012345678901234567890123";
      const passphrase = "this is my passphrase";

      it("should return the known account address", async () => {
        const provider = await getProvider();
        const newAccount = await provider.send("personal_importRawKey", [
          secretKey,
          passphrase
        ]);
        assert.strictEqual(
          newAccount,
          "0x14791697260e4c9a71f18484c9f997b308e59325",
          "Raw account not imported correctly"
        );
      });

      describe("personal_unlockAccount ➡ eth_sendTransaction ➡ personal_lockAccount", () => {
        it("generates locked accounts with passphrase", async () => {
          const provider = await getProvider({ miner: { gasPrice: 0 } });
          const passphrase = "this is my passphrase";
          // generate an account
          const newAccount = await provider.send("personal_importRawKey", [
            secretKey,
            passphrase
          ]);

          await testLockedAccountWithPassphraseViaEth_SendTransaction(
            provider,
            newAccount,
            passphrase
          );
        });
      });

      describe("personal_sendTransaction", () => {
        it("generates locked accounts with passphrase", async () => {
          const provider = await getProvider({ miner: { gasPrice: 0 } });
          // generate an account
          const newAccount = await provider.send("personal_importRawKey", [
            secretKey,
            passphrase
          ]);

          await testLockedAccountWithPassphraseViaPersonal_SendTransaction(
            provider,
            newAccount,
            passphrase
          );
        });
      });
    });
  });
});
