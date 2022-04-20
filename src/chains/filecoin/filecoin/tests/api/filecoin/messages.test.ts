import assert from "assert";
import { FilecoinProvider } from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import { Address, AddressProtocol } from "../../../src/things/address";
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
import { RandomNumberGenerator } from "@ganache/utils";

const LotusRPC = require("@filecoin-shipyard/lotus-client-rpc").LotusRPC;

type LotusClient = any;

describe("api", () => {
  describe("filecoin", () => {
    let provider: FilecoinProvider;
    let client: LotusClient;
    let accounts: Account[];
    let expectedHeight = 0;

    before(async () => {
      provider = await getProvider();
      client = new LotusRPC(provider, { schema: FilecoinProvider.Schema });
      accounts =
        await provider.blockchain.accountManager.getControllableAccounts();
    });

    after(async () => {
      await provider.stop();
    });

    const waitForExpectedHeight = async () => {
      // give some time for it to finish mining any/all blocks
      await new Promise(resolve => setTimeout(resolve, 300));
      const newHead: SerializedBlockHeader = await client.chainHead();
      assert.strictEqual(newHead.Height, expectedHeight);
    };

    describe("Filecoin.MpoolPushMessage and Filecoin.MpoolGetNonce", () => {
      afterEach(async () => {
        // we need to make sure any mining has finished from a prior test
        // to not affect the next test
        await waitForExpectedHeight();
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
        const signedMessage: SerializedSignedMessage =
          await client.mpoolPushMessage(message, messageSendSpec);
        expectedHeight++;
        assert.ok(signedMessage);
        await waitForExpectedHeight();

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

          const signedMessage: SerializedSignedMessage =
            await client.mpoolPushMessage(message, messageSendSpec);
          expectedHeight++;

          assert.strictEqual(signedMessage.Message.Nonce, priorFromNonce);

          await waitForExpectedHeight();

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
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail("Successfully sent message without enough funds");
        } catch (e: any) {
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
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail("Successfully sent message without enough funds");
        } catch (e: any) {
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
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail("Successfully sent unsigned message with non-zero nonce");
        } catch (e: any) {
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
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent unsigned message with non-zero method"
          );
        } catch (e: any) {
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

        await client.mpoolPushMessage(message, messageSendSpec);
        expectedHeight++;
        await waitForExpectedHeight();

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
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent unsigned message with an account we don't have the private key for"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes("Could not sign message with address"),
            e.message
          );
        }
      });

      it("should reject an unsigned message with the wrong version", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const message: SerializedMessage = {
          Version: 1,
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

        try {
          await client.mpoolPushMessage(message, messageSendSpec);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent an unsigned message with the wrong version"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(e.message.includes("'Version' unsupported"), e.message);
        }
      });

      it("should reject an unsigned message with an empty To field", async () => {
        const From = accounts[0].address.value;

        const message: SerializedMessage = {
          Version: 0,
          From,
          To: "",
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

        try {
          await client.mpoolPushMessage(message, messageSendSpec);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent an unsigned message with an empty To field"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes(
              "The To address is an invalid protocol; please use a BLS or SECP256K1 address."
            ),
            e.message
          );
        }
      });

      it("should reject an unsigned message with an empty From field", async () => {
        const To = accounts[1].address.value;

        const message: SerializedMessage = {
          Version: 0,
          From: "",
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

        try {
          await client.mpoolPushMessage(message, messageSendSpec);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent an unsigned message with an empty From field"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes(
              "The From address is an invalid protocol; please use a BLS or SECP256K1 address."
            ),
            e.message
          );
        }
      });

      it("should reject an unsigned message with an empty To field", async () => {
        const From = accounts[0].address.value;

        const message: SerializedMessage = {
          Version: 0,
          From,
          To: "t3yaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaby2smx7a",
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

        try {
          await client.mpoolPushMessage(message, messageSendSpec);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent an unsigned message with the To field being the zero address"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(e.message.includes("invalid 'To' address"), e.message);
        }
      });

      it("should reject an unsigned message with a negative Value", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const message: SerializedMessage = {
          Version: 0,
          From,
          To,
          Nonce: 0,
          Value: "-1",
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
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent an unsigned message with a negative Value"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes("'Value' field cannot be negative"),
            e.message
          );
        }
      });

      it("should reject an unsigned message with a value greater than the total filecoin supply", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const message: SerializedMessage = {
          Version: 0,
          From,
          To,
          Nonce: 0,
          Value: Balance.FILToLowestDenomination(2000000001).toString(),
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
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent an unsigned message with a value greater than the total filecoin supply"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(e.message.includes("mpool push: not enough funds"), e.message);
        }
      });

      it("should reject an unsigned message with a negative GasFeeCap", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const message: SerializedMessage = {
          Version: 0,
          From,
          To,
          Nonce: 0,
          Value: "1",
          GasLimit: 0,
          GasFeeCap: "-1",
          GasPremium: "0",
          Method: 0,
          Params: ""
        };

        const messageSendSpec: SerializedMessageSendSpec = {
          MaxFee: "0"
        };

        try {
          await client.mpoolPushMessage(message, messageSendSpec);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent an unsigned message with a negative GasFeeCap"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes("'GasFeeCap' field cannot be negative"),
            e.message
          );
        }
      });

      it("should reject an unsigned message with a negative GasPremium", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const message: SerializedMessage = {
          Version: 0,
          From,
          To,
          Nonce: 0,
          Value: "1",
          GasLimit: 0,
          GasFeeCap: "1",
          GasPremium: "-1",
          Method: 0,
          Params: ""
        };

        const messageSendSpec: SerializedMessageSendSpec = {
          MaxFee: "0"
        };

        try {
          await client.mpoolPushMessage(message, messageSendSpec);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent an unsigned message with a negative GasPremium"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes("'GasPremium' field cannot be negative"),
            e.message
          );
        }
      });

      it("should reject an unsigned message with a GasPremium > GasFeeCap", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const message: SerializedMessage = {
          Version: 0,
          From,
          To,
          Nonce: 0,
          Value: "1",
          GasLimit: 0,
          GasFeeCap: "1000",
          GasPremium: "1001",
          Method: 0,
          Params: ""
        };

        const messageSendSpec: SerializedMessageSendSpec = {
          MaxFee: "0"
        };

        try {
          await client.mpoolPushMessage(message, messageSendSpec);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent an unsigned message with a GasPremium > GasFeeCap"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes("'GasFeeCap' less than 'GasPremium'"),
            e.message
          );
        }
      });

      it("should reject an unsigned message with a GasLimit > BlockGasLimit", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const message: SerializedMessage = {
          Version: 0,
          From,
          To,
          Nonce: 0,
          Value: "1",
          GasLimit: 10000000001,
          GasFeeCap: "1000",
          GasPremium: "1000",
          Method: 0,
          Params: ""
        };

        const messageSendSpec: SerializedMessageSendSpec = {
          MaxFee: "0"
        };

        try {
          await client.mpoolPushMessage(message, messageSendSpec);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent an unsigned message with a GasLimit > BlockGasLimit"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes(
              "'GasLimit' field cannot be greater than a block's gas limit"
            ),
            e.message
          );
        }
      });

      it("should reject an unsigned message with a GasLimit < minGas", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const message: SerializedMessage = {
          Version: 0,
          From,
          To,
          Nonce: 0,
          Value: "1",
          GasLimit: -1,
          GasFeeCap: "1000",
          GasPremium: "1000",
          Method: 0,
          Params: ""
        };

        const messageSendSpec: SerializedMessageSendSpec = {
          MaxFee: "0"
        };

        try {
          await client.mpoolPushMessage(message, messageSendSpec);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent an unsigned message with a GasLimit < minGas"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes(
              "'GasLimit' field cannot be less than the cost of storing a message on chain"
            ),
            e.message
          );
        }
      });
    });

    describe("Filecoin.MpoolPush", () => {
      afterEach(async () => {
        // we need to make sure any mining has finished from a prior test
        // to not affect the next test
        await waitForExpectedHeight();
      });

      it("should accept a properly signed (with BLS address) transfer message", async () => {
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
        expectedHeight++; // if we succeeded to send, this will get mined
        assert.ok(result);
      });

      it("should accept a properly signed (with SECP256K1 address) transfer message", async () => {
        const originalAddress = accounts[0].address.value;
        const secpAddress = Address.random(
          new RandomNumberGenerator(),
          AddressProtocol.SECP256K1
        );

        const nonce = await client.mpoolGetNonce(originalAddress);

        // Let's give the new address some funds
        const message = new Message({
          Version: 0,
          To: secpAddress.value,
          From: originalAddress,
          Nonce: nonce,
          Value: Balance.FILToLowestDenomination(1).toString(),
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
        expectedHeight++; // if we succeeded to send, this will get mined
        assert.ok(result);

        await waitForExpectedHeight();

        // Now let's send something from the new SECP256K1 address
        const message2 = new Message({
          Version: 0,
          To: originalAddress,
          From: secpAddress.value,
          Nonce: nonce,
          Value: "1",
          GasLimit: 520000,
          GasFeeCap: "1000",
          GasPremium: "1000",
          Method: 0,
          Params: ""
        });

        const signature2 = await secpAddress.signMessage(message2);

        const signedMessage2 = new SignedMessage({
          message: message2,
          signature: new Signature({
            type: SigType.SigTypeSecp256k1,
            data: signature2
          })
        });

        const result2 = await client.mpoolPush(signedMessage2);
        expectedHeight++;
        assert.ok(result2);
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
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent a signed message with the wrong signature"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes("bls signature failed to verify"),
            e.message
          );
        }
      });

      it("should reject a signed message with the wrong version", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const nonce = await client.mpoolGetNonce(From);

        const message = new Message({
          Version: 1,
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

        try {
          await client.mpoolPush(signedMessage);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent a signed message with the wrong version"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(e.message.includes("'Version' unsupported"), e.message);
        }
      });

      it("should reject a signed message with an empty To field", async () => {
        const From = accounts[0].address.value;

        const nonce = await client.mpoolGetNonce(From);

        const message = new Message({
          Version: 0,
          To: "",
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

        try {
          await client.mpoolPush(signedMessage);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent a signed message with an empty To field"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(e.message.includes("'To' address cannot be empty"), e.message);
        }
      });

      it("should reject a signed message with an empty From field", async () => {
        const To = accounts[1].address.value;

        const message = new Message({
          Version: 0,
          To,
          From: "",
          Nonce: 0,
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

        try {
          await client.mpoolPush(signedMessage);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent a signed message with an empty To field"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes("'From' address cannot be empty"),
            e.message
          );
        }
      });

      it("should reject a signed message with the To field being the zero address", async () => {
        const From = accounts[0].address.value;

        const nonce = await client.mpoolGetNonce(From);

        const message = new Message({
          Version: 0,
          To: "t3yaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaby2smx7a",
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

        try {
          await client.mpoolPush(signedMessage);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent a signed message with the To field being the zero address"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(e.message.includes("invalid 'To' address"), e.message);
        }
      });

      it("should reject a signed message with a negative Value", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const nonce = await client.mpoolGetNonce(From);

        const message = new Message({
          Version: 0,
          To,
          From,
          Nonce: nonce,
          Value: "-1",
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

        try {
          await client.mpoolPush(signedMessage);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent a signed message with a negative Value"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes("'Value' field cannot be negative"),
            e.message
          );
        }
      });

      it("should reject a signed message with a value greater than the total filecoin supply", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const nonce = await client.mpoolGetNonce(From);

        const message = new Message({
          Version: 0,
          To,
          From,
          Nonce: nonce,
          Value: Balance.FILToLowestDenomination(2000000001).toString(),
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

        try {
          await client.mpoolPush(signedMessage);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent a signed message with a value greater than the total filecoin supply"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes(
              "'Value' field cannot be greater than total filecoin supply"
            ),
            e.message
          );
        }
      });

      it("should reject a signed message with a negative GasFeeCap", async () => {
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
          GasFeeCap: "-1",
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

        try {
          await client.mpoolPush(signedMessage);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent a signed message with a negative GasFeeCap"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes("'GasFeeCap' field cannot be negative"),
            e.message
          );
        }
      });

      it("should reject a signed message with a negative GasPremium", async () => {
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
          GasPremium: "-1",
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

        try {
          await client.mpoolPush(signedMessage);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent a signed message with a negative GasPremium"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes("'GasPremium' field cannot be negative"),
            e.message
          );
        }
      });

      it("should reject a signed message with a GasPremium > GasFeeCap", async () => {
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
          GasPremium: "1001",
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

        try {
          await client.mpoolPush(signedMessage);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent a signed message with a GasPremium > GasFeeCap"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes("'GasFeeCap' less than 'GasPremium'"),
            e.message
          );
        }
      });

      it("should reject a signed message with a GasLimit > BlockGasLimit", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const nonce = await client.mpoolGetNonce(From);

        const message = new Message({
          Version: 0,
          To,
          From,
          Nonce: nonce,
          Value: "1",
          GasLimit: 10000000001,
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

        try {
          await client.mpoolPush(signedMessage);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent a signed message with a GasLimit > BlockGasLimit"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes(
              "'GasLimit' field cannot be greater than a block's gas limit"
            ),
            e.message
          );
        }
      });

      it("should reject a signed message with a GasLimit < minGas", async () => {
        const From = accounts[0].address.value;
        const To = accounts[1].address.value;

        const nonce = await client.mpoolGetNonce(From);

        const message = new Message({
          Version: 0,
          To,
          From,
          Nonce: nonce,
          Value: "1",
          GasLimit: -1,
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

        try {
          await client.mpoolPush(signedMessage);
          expectedHeight++; // if we succeeded to send, this will get mined
          assert.fail(
            "Successfully sent a signed message with a GasLimit < minGas"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes(
              "'GasLimit' field cannot be less than the cost of storing a message on chain"
            ),
            e.message
          );
        }
      });
    });

    describe("Filecoin.MpoolBatchPushMessage", () => {
      afterEach(async () => {
        // we need to make sure any mining has finished from a prior test
        // to not affect the next test
        await waitForExpectedHeight();
      });

      it("should transfer funds with two messages in one batch", async () => {
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
        const signedMessages: SerializedSignedMessage[] =
          await client.mpoolBatchPushMessage(
            [message, message],
            messageSendSpec
          );
        expectedHeight += 2; // theres a block per transaction
        assert.ok(signedMessages);
        await waitForExpectedHeight();

        const newFromBalance: string = await client.walletBalance(From);
        const newToBalance: string = await client.walletBalance(To);
        const minerFee =
          BigInt(signedMessages[0].Message.GasLimit) *
            BigInt(signedMessages[0].Message.GasPremium) +
          BigInt(signedMessages[1].Message.GasLimit) *
            BigInt(signedMessages[1].Message.GasPremium);
        assert.notStrictEqual(minerFee.toString(), "0"); // gas should be auto generated

        // we have to compare as strings rather than bigints due to a bug
        // in mocha: https://git.io/JtE8r; pending PR: https://git.io/JtE8o
        assert.strictEqual(
          BigInt(newFromBalance).toString(),
          (
            BigInt(priorFromBalance) -
            BigInt(message.Value) * 2n -
            minerFee
          ).toString()
        );
        assert.strictEqual(
          BigInt(newToBalance).toString(),
          (BigInt(priorToBalance) + BigInt(message.Value) * 2n).toString()
        );
      });
    });

    describe("Filecoin.MpoolBatchPush", () => {
      afterEach(async () => {
        // we need to make sure any mining has finished from a prior test
        // to not affect the next test
        await waitForExpectedHeight();
      });

      it("should accept two properly signed (with BLS address) transfer messages in batch", async () => {
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
        const message2 = new Message({
          Version: 0,
          To,
          From,
          Nonce: nonce + 1,
          Value: "1",
          GasLimit: 520000,
          GasFeeCap: "1000",
          GasPremium: "1000",
          Method: 0,
          Params: ""
        });

        const signature = await accounts[0].address.signMessage(message);
        const signature2 = await accounts[0].address.signMessage(message2);

        const signedMessage = new SignedMessage({
          message,
          signature: new Signature({
            type: SigType.SigTypeBLS,
            data: signature
          })
        });
        const signedMessage2 = new SignedMessage({
          message: message2,
          signature: new Signature({
            type: SigType.SigTypeBLS,
            data: signature2
          })
        });

        const result = await client.mpoolBatchPush([
          signedMessage,
          signedMessage2
        ]);
        expectedHeight += 2; // theres a block per transaction
        assert.ok(result);
      });
    });

    describe("Message Pool Control Functions", () => {
      let provider2: FilecoinProvider;
      let client2: LotusClient;
      let accounts2: Account[];
      let expectedHeight2 = 0;

      before(async () => {
        provider2 = await getProvider({
          chain: {
            ipfsPort: 5003
          },
          miner: {
            mine: false
          }
        });
        client2 = new LotusRPC(provider2, { schema: FilecoinProvider.Schema });
        accounts2 =
          await provider2.blockchain.accountManager.getControllableAccounts();
      });

      after(async () => {
        await provider2.stop();
      });

      const waitForExpectedHeight2 = async () => {
        // give some time for it to finish mining any/all blocks
        await new Promise(resolve => setTimeout(resolve, 100));
        const newHead: SerializedBlockHeader = await client2.chainHead();
        assert.strictEqual(newHead.Height, expectedHeight2);
      };

      afterEach(async () => {
        // we need to make sure any mining has finished from a prior test
        // to not affect the next test
        await waitForExpectedHeight2();
      });

      it("adds and checks messages to the message pool", async () => {
        const From = accounts2[0].address.value;
        const To = accounts2[1].address.value;
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

        const signedMessage1: SerializedSignedMessage =
          await client2.mpoolPushMessage(message, messageSendSpec);
        const signedMessage2: SerializedSignedMessage =
          await client2.mpoolPushMessage(message, messageSendSpec);

        const pendingMessages: SerializedSignedMessage[] =
          await client2.mpoolPending();

        assert.strictEqual(pendingMessages.length, 2);
        assert.deepStrictEqual(pendingMessages[0], signedMessage1);
        assert.deepStrictEqual(pendingMessages[1], signedMessage2);

        const selectMessages = await client2.mpoolSelect();

        assert.deepStrictEqual(selectMessages, pendingMessages);
      });

      it("clears messages from the message pool", async () => {
        // This should not clear local messages (all of them are local currently)
        await client2.mpoolClear(false);
        const localPendingMessages: SerializedSignedMessage[] =
          await client2.mpoolPending();
        assert.strictEqual(localPendingMessages.length, 2);

        // This should clear all messages
        await client2.mpoolClear(true);
        const allPendingMessages: SerializedSignedMessage[] =
          await client2.mpoolPending();
        assert.strictEqual(allPendingMessages.length, 0);

        // make sure we didn't mine a block which would cause the pool to clear
        const head: SerializedBlockHeader = await client2.chainHead();
        assert.strictEqual(head.Height, 0);
      });
    });

    describe("Filecoin.ChainGetBlockMessages", () => {
      it("should get the block messages for a block cid", async () => {
        const tipset = await client.chainHead();
        const blockMessages = await client.chainGetBlockMessages(
          tipset.Cids[0]
        );
        assert.strictEqual(blockMessages.Cids.length, 1);
        assert.strictEqual(blockMessages.BlsMessages.length, 1);
      });
    });

    describe("Filecoin.ChainGetMessage", () => {
      it("should get a message directly from a message cid", async () => {
        const tipset = await client.chainHead();
        const blockMessages = await client.chainGetBlockMessages(
          tipset.Cids[0]
        );
        const message = await client.chainGetMessage(blockMessages.Cids[0]);
        assert.deepStrictEqual(message, blockMessages.BlsMessages[0]);
      });
    });
  });
});
