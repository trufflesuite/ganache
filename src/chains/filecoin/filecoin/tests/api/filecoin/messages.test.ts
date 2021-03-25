import assert from "assert";
import FilecoinProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import { Address } from "../../../src/things/address";
import { Message, SerializedMessage } from "../../../src/things/message";
import { Account } from "../../../src/things/account";
import { SerializedMessageSendSpec } from "../../../src/things/message-send-spec";
import {
  SerializedSignedMessage,
  SignedMessage
} from "../../../src/things/signed-message";
import { SerializedBlockHeader } from "../../../src/things/block-header";
import { Balance } from "../../../src/things/balance";
import { Signature } from "../../../src/things/signature";
import { SigType } from "../../../src/things/sig-type";

const LotusRPC = require("@filecoin-shipyard/lotus-client-rpc").LotusRPC;

type LotusClient = any;

describe("api", () => {
  describe("filecoin", () => {
    let provider: FilecoinProvider;
    let client: LotusClient;

    before(async () => {
      provider = await getProvider();
      client = new LotusRPC(provider, { schema: FilecoinProvider.Schema });
    });

    after(async () => {
      await provider.stop();
    });

    describe("Filecoin.MpoolPushMessage and Filecoin.MpoolGetNonce", () => {
      let accounts: Account[];

      before(async () => {
        accounts = await provider.blockchain.accountManager.getControllableAccounts();
      });

      it("should transfer funds", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;
        const message: SerializedMessage = {
          Version: 0,
          From,
          To,
          Nonce: 0,
          Value: "1",
          GasLimit: 0,
          GasFeeCap: "0",
          GasPremium: "0",
          Method: 0,
          Params: ""
        };

        const messageSendSpec: SerializedMessageSendSpec = {
          MaxFee: "0"
        };

        const priorFromBalance: string = await client.walletBalance(From);
        const priorToBalance: string = await client.walletBalance(To);
        const priorHead: SerializedBlockHeader = await client.chainHead();
        const signedMessage: SerializedSignedMessage = await client.mpoolPushMessage(
          message,
          messageSendSpec
        );
        assert.ok(signedMessage);
        // since `mpoolPushMessage` doesn't wait for instamine, we have to poll blocks
        let newHead: SerializedBlockHeader;
        for (let i = 0; i < 5; i++) {
          // small wait
          await new Promise(resolve => setTimeout(resolve, 25));
          newHead = await client.chainHead();
          if (newHead.Height !== priorHead.Height) {
            break;
          }
        }
        assert.strictEqual(newHead.Height, priorHead.Height + 1);

        const newFromBalance: string = await client.walletBalance(From);
        const newToBalance: string = await client.walletBalance(To);
        const minerFee =
          BigInt(signedMessage.Message.GasLimit) *
          BigInt(signedMessage.Message.GasPremium);
        assert.notStrictEqual(minerFee.toString(), "0"); // gas should be auto generated

        // we have to compare as strings rather than bigints due to a bug
        // in mocha: https://git.io/JtE8r; pending PR: https://git.io/JtE8o
        assert.strictEqual(
          BigInt(newFromBalance).toString(),
          (
            BigInt(priorFromBalance) -
            BigInt(message.Value) -
            minerFee
          ).toString()
        );
        assert.strictEqual(
          BigInt(newToBalance).toString(),
          (BigInt(priorToBalance) + BigInt(message.Value)).toString()
        );
      });

      it("should get the correct nonce with no pending blocks", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        // do this test twice to ensure nonces are incrementing
        for (let i = 0; i < 2; i++) {
          const priorFromNonce = await client.mpoolGetNonce(From);
          const priorToNonce = await client.mpoolGetNonce(To);
          const priorHead: SerializedBlockHeader = await client.chainHead();

          const message: SerializedMessage = {
            Version: 0,
            From,
            To,
            Nonce: 0,
            Value: "1",
            GasLimit: 0,
            GasFeeCap: "0",
            GasPremium: "0",
            Method: 0,
            Params: ""
          };

          const messageSendSpec: SerializedMessageSendSpec = {
            MaxFee: "0"
          };

          const signedMessage: SerializedSignedMessage = await client.mpoolPushMessage(
            message,
            messageSendSpec
          );

          assert.strictEqual(signedMessage.Message.Nonce, priorFromNonce);

          // since `mpoolPushMessage` doesn't wait for instamine, we have to poll blocks
          let newHead: SerializedBlockHeader;
          for (let i = 0; i < 5; i++) {
            // small wait
            await new Promise(resolve => setTimeout(resolve, 25));
            newHead = await client.chainHead();
            if (newHead.Height !== priorHead.Height) {
              break;
            }
          }
          assert.strictEqual(newHead.Height, priorHead.Height + 1);

          const newFromNonce = await client.mpoolGetNonce(From);
          const newToNonce = await client.mpoolGetNonce(To);

          assert.strictEqual(newFromNonce, priorFromNonce + 1);
          assert.strictEqual(newToNonce, priorToNonce);
        }
      });

      it("should reject transfer message if there aren't enough funds", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const balance: string = await client.walletBalance(From);
        const value = BigInt(balance) * 2n;

        const message: SerializedMessage = {
          Version: 0,
          To,
          From,
          Nonce: 0,
          Value: value.toString(),
          GasLimit: 0,
          GasFeeCap: "0",
          GasPremium: "0",
          Method: 0,
          Params: ""
        };

        const messageSendSpec: SerializedMessageSendSpec = {
          MaxFee: "0"
        };

        try {
          await client.mpoolPushMessage(message, messageSendSpec);
          assert.fail("Successfully sent message without enough funds");
        } catch (e) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(e.message.includes("mpool push: not enough funds"), e.message);
        }
      });

      it("should reject transfer message if there aren't enough funds due to gas fees", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const balance: string = await client.walletBalance(From);

        const message: SerializedMessage = {
          Version: 0,
          To,
          From,
          Nonce: 0,
          Value: balance,
          GasLimit: 0,
          GasFeeCap: "0",
          GasPremium: "0",
          Method: 0,
          Params: ""
        };

        const messageSendSpec: SerializedMessageSendSpec = {
          MaxFee: "0"
        };

        try {
          await client.mpoolPushMessage(message, messageSendSpec);
          assert.fail("Successfully sent message without enough funds");
        } catch (e) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(e.message.includes("mpool push: not enough funds"), e.message);
        }
      });

      it("should reject unsigned transfer message if a non-zero nonce is provided", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const message: SerializedMessage = {
          Version: 0,
          To,
          From,
          Nonce: 1,
          Value: "1",
          GasLimit: 0,
          GasFeeCap: "0",
          GasPremium: "0",
          Method: 0,
          Params: ""
        };

        const messageSendSpec: SerializedMessageSendSpec = {
          MaxFee: "0"
        };

        try {
          await client.mpoolPushMessage(message, messageSendSpec);
          assert.fail("Successfully sent unsigned message with non-zero nonce");
        } catch (e) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes(
              "MpoolPushMessage expects message nonce to be 0"
            ),
            e.message
          );
        }
      });

      it("should reject transfer message for non-zero (transfer) methods", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const message: SerializedMessage = {
          Version: 0,
          To,
          From,
          Nonce: 0,
          Value: "1",
          GasLimit: 0,
          GasFeeCap: "0",
          GasPremium: "0",
          Method: 1,
          Params: ""
        };

        const messageSendSpec: SerializedMessageSendSpec = {
          MaxFee: "0"
        };

        try {
          await client.mpoolPushMessage(message, messageSendSpec);
          assert.fail(
            "Successfully sent unsigned message with non-zero method"
          );
        } catch (e) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert.strictEqual(
            e.message,
            "Unsupported Method (1); only value transfers (Method: 0) are supported in Ganache."
          );
        }
      });

      it("should reject transfer message for sending it from an uncontrolled address", async () => {
        const address = Address.random();
        const randomAddress = address.value;
        const ourAddress = accounts[0].address.value;

        // first let's fund the address we'll want to try to send from
        let message: SerializedMessage = {
          Version: 0,
          To: randomAddress,
          From: ourAddress,
          Nonce: 0,
          Value: Balance.FILToLowestDenomination(1).toString(),
          GasLimit: 0,
          GasFeeCap: "0",
          GasPremium: "0",
          Method: 0,
          Params: ""
        };

        const messageSendSpec: SerializedMessageSendSpec = {
          MaxFee: "0"
        };

        const priorHead: SerializedBlockHeader = await client.chainHead();
        await client.mpoolPushMessage(message, messageSendSpec);
        // since `mpoolPushMessage` doesn't wait for instamine, we have to poll blocks
        let newHead: SerializedBlockHeader;
        for (let i = 0; i < 5; i++) {
          // small wait
          await new Promise(resolve => setTimeout(resolve, 25));
          newHead = await client.chainHead();
          if (newHead.Height !== priorHead.Height) {
            break;
          }
        }
        assert.strictEqual(newHead.Height, priorHead.Height + 1);

        // now let's try to send funds from the address we don't control
        message = {
          Version: 0,
          To: ourAddress,
          From: randomAddress,
          Nonce: 0,
          Value: "1",
          GasLimit: 0,
          GasFeeCap: "0",
          GasPremium: "0",
          Method: 0,
          Params: ""
        };

        try {
          await client.mpoolPushMessage(message, messageSendSpec);
          assert.fail(
            "Successfully sent unsigned message with an account we don't have the private key for"
          );
        } catch (e) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes("Could not sign message with address"),
            e.message
          );
        }
      });

      it("should accept a properly signed transfer message", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const nonce = await client.mpoolGetNonce(From);

        const message = new Message({
          Version: 0,
          To,
          From,
          Nonce: nonce,
          Value: "1",
          GasLimit: 520000,
          GasFeeCap: "1000",
          GasPremium: "1000",
          Method: 0,
          Params: ""
        });

        const signature = await accounts[0].address.signMessage(message);

        const signedMessage = new SignedMessage({
          message,
          signature: new Signature({
            type: SigType.SigTypeBLS,
            data: signature
          })
        });

        const result = await client.mpoolPush(signedMessage);
        assert.ok(result);
      });

      it("should reject a signed transfer message with the wrong signature", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const nonce = await client.mpoolGetNonce(From);

        const message = new Message({
          Version: 0,
          To,
          From,
          Nonce: nonce,
          Value: "1",
          GasLimit: 520000,
          GasFeeCap: "1000",
          GasPremium: "1000",
          Method: 0,
          Params: ""
        });

        const signature = await accounts[1].address.signMessage(message);

        const signedMessage = new SignedMessage({
          message,
          signature: new Signature({
            type: SigType.SigTypeBLS,
            data: signature
          })
        });

        try {
          await client.mpoolPush(signedMessage);
          assert.fail(
            "Successfully sent a signed message with the wrong signature"
          );
        } catch (e) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(e.message.includes("bls signature failed to verify"));
        }
      });
    });
  });
});
