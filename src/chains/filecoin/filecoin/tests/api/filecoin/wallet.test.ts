import assert from "assert";
import { FilecoinProvider } from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import { Address, AddressProtocol } from "../../../src/things/address";
import { KeyType } from "../../../src/things/key-type";
import { SerializedKeyInfo } from "../../../src/things/key-info";
import { SigType } from "../../../src/things/sig-type";
import { RandomNumberGenerator } from "@ganache/utils";
import { Message, SerializedMessage } from "../../../src/things/message";
import { SerializedSignature } from "../../../src/things/signature";
import { SerializedSignedMessage } from "../../../src/things/signed-message";

const LotusRPC = require("@filecoin-shipyard/lotus-client-rpc").LotusRPC;

type LotusClient = any;

describe("api", () => {
  describe("filecoin", () => {
    let provider: FilecoinProvider;
    let client: LotusClient;
    let walletAddresses: string[];

    before(async () => {
      provider = await getProvider();
      client = new LotusRPC(provider, { schema: FilecoinProvider.Schema });
    });

    after(async () => {
      if (provider) {
        await provider.stop();
      }
    });

    describe("Filecoin.WalletList", () => {
      it("should return an array of controlled addresses", async () => {
        walletAddresses = await client.walletList();
        assert(Array.isArray(walletAddresses));
        assert.strictEqual(walletAddresses.length, 10);
      });
    });

    describe("Filecoin.WalletDefaultAddress", () => {
      it("should return a single address", async () => {
        const address = await client.walletDefaultAddress();
        assert.strictEqual(address.length, 86);
        assert.strictEqual(address.indexOf("t3"), 0);
        assert.strictEqual(address, walletAddresses[0]);
      });
    });

    describe("Filecoin.WalletSetDefault", () => {
      it("should change the default address", async () => {
        const oldDefault = walletAddresses[0];
        const newDefault = walletAddresses[1];
        let address = await client.walletDefaultAddress();
        assert.strictEqual(oldDefault, address);
        await client.walletSetDefault(newDefault);
        address = await client.walletDefaultAddress();
        assert.strictEqual(address, newDefault);
        walletAddresses = await client.walletList();
        assert.strictEqual(walletAddresses[0], newDefault);
        assert.strictEqual(walletAddresses[1], oldDefault);
        assert.strictEqual(walletAddresses.length, 10);
      });
    });

    describe("Filecoin.WalletNew", () => {
      it("should create a new account with a random BLS address", async () => {
        const addressString = await client.walletNew(KeyType.KeyTypeBLS);
        const address = new Address(addressString);
        assert.strictEqual(address.protocol, AddressProtocol.BLS);
        walletAddresses = await client.walletList();
        assert.strictEqual(walletAddresses.length, 11);
        assert.strictEqual(walletAddresses[10], address.value);
      });

      it("should create a new account with a random SECP256K1 address", async () => {
        const addressString = await client.walletNew(KeyType.KeyTypeSecp256k1);
        const address = new Address(addressString);
        assert.strictEqual(address.protocol, AddressProtocol.SECP256K1);
        walletAddresses = await client.walletList();
        assert.strictEqual(walletAddresses.length, 12);
        assert.strictEqual(walletAddresses[11], address.value);
      });

      it("should reject creation of a new account for secp256k1-ledger", async () => {
        try {
          await client.walletNew("secp256k1-ledger");
          assert.fail(
            "Successfully created an account for KeyType secp256k1-ledger"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes(
              `KeyType of secp256k1-ledger is not supported. Please use "bls" or "secp256k1".`
            ),
            e.message
          );
        }
      });
    });

    describe("Filecoin.WalletHas", () => {
      it("should confirm that the wallet has a known address", async () => {
        const hasAddress = await client.walletHas(walletAddresses[0]);
        assert.strictEqual(hasAddress, true);
      });

      it("should confirm that the wallet doesn't have an unknown address", async () => {
        const address = Address.random();
        const hasAddress = await client.walletHas(address.value);
        assert.strictEqual(hasAddress, false);
      });
    });

    describe("Filecoin.WalletDelete", () => {
      it("should delete the first address", async () => {
        const oldDefault = walletAddresses[0];
        const newDefault = walletAddresses[1];
        assert.strictEqual(walletAddresses.length, 12);
        await client.walletDelete(oldDefault);
        const address = await client.walletDefaultAddress();
        assert.strictEqual(address, newDefault);
        walletAddresses = await client.walletList();
        assert.strictEqual(walletAddresses.length, 11);
        assert.strictEqual(walletAddresses.includes(oldDefault), false);
      });

      it("should do nothing when deleting a random address", async () => {
        const address = Address.random();
        walletAddresses = await client.walletList();
        assert.strictEqual(walletAddresses.length, 11);
        await client.walletDelete(address.value);
        walletAddresses = await client.walletList();
        assert.strictEqual(walletAddresses.length, 11);
      });
    });

    describe("Filecoin.WalletImport and Filecoin.WalletExport", () => {
      let addressBLS: Address;
      let addressSECP256K1: Address;

      it("should import a random BLS address/privatekey", async () => {
        addressBLS = Address.random();
        const importedAddress = await client.walletImport({
          Type: KeyType.KeyTypeBLS,
          PrivateKey: Buffer.from(addressBLS.privateKey, "hex").toString(
            "base64"
          )
        });
        assert.strictEqual(importedAddress, addressBLS.value);
        walletAddresses = await client.walletList();
        assert.strictEqual(walletAddresses.length, 12);
        assert.strictEqual(walletAddresses[11], addressBLS.value);
      });

      it("should import a random SECP256K1 address/privatekey", async () => {
        addressSECP256K1 = Address.random(
          new RandomNumberGenerator(),
          AddressProtocol.SECP256K1
        );
        const importedAddress = await client.walletImport({
          Type: KeyType.KeyTypeSecp256k1,
          PrivateKey: Buffer.from(addressSECP256K1.privateKey, "hex").toString(
            "base64"
          )
        });
        assert.strictEqual(importedAddress, addressSECP256K1.value);
        walletAddresses = await client.walletList();
        assert.strictEqual(walletAddresses.length, 13);
        assert.strictEqual(walletAddresses[12], addressSECP256K1.value);
      });

      it("should reject importing a secp256k1-ledger address", async () => {
        try {
          const address = Address.random(
            new RandomNumberGenerator(),
            AddressProtocol.SECP256K1
          );
          await client.walletImport({
            Type: KeyType.KeyTypeSecp256k1Ledger,
            PrivateKey: Buffer.from(address.privateKey, "hex").toString(
              "base64"
            )
          });
          assert.fail(
            "Successfully imported an account with KeyType secp256k1-ledger"
          );
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes(`Ganache doesn't support ledger accounts`),
            e.message
          );
        }
      });

      it("should export the private key of a BLS address", async () => {
        const keyInfo: SerializedKeyInfo = await client.walletExport(
          addressBLS.value
        );
        assert.strictEqual(keyInfo.Type, KeyType.KeyTypeBLS);
        assert.strictEqual(
          Buffer.from(keyInfo.PrivateKey, "base64").toString("hex"),
          addressBLS.privateKey
        );
      });

      it("should export the private key of a SECP256K1 address", async () => {
        const keyInfo: SerializedKeyInfo = await client.walletExport(
          addressSECP256K1.value
        );
        assert.strictEqual(keyInfo.Type, KeyType.KeyTypeSecp256k1);
        assert.strictEqual(
          Buffer.from(keyInfo.PrivateKey, "base64").toString("hex"),
          addressSECP256K1.privateKey
        );
      });
    });

    describe("Filecoin.WalletSign", () => {
      it("signs a buffer via API", async () => {
        const account = await provider.blockchain.accountManager!.getAccount(
          walletAddresses[0]
        );
        const buffer = Buffer.from([0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]);
        const directSignature = await account.address.signBuffer(buffer);
        const apiSignature: SerializedSignature = await client.walletSign(
          account.address.value,
          buffer.toString("base64")
        );
        assert.strictEqual(apiSignature.Type, SigType.SigTypeBLS);
        assert.strictEqual(
          directSignature.toString("base64"),
          apiSignature.Data
        );
      });

      it("fails to sign a buffer via API for an unknown address", async () => {
        try {
          const address = Address.random();
          const buffer = Buffer.from([0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]);
          await client.walletSign(address.value, buffer.toString("base64"));
          assert.fail("Successfully signed a buffer with an unknown address");
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes(`due to not having the associated private key.`),
            e.message
          );
        }
      });
    });

    describe("Filecoin.WalletSignMessage", () => {
      it("signs a Message via API", async () => {
        const account = await provider.blockchain.accountManager!.getAccount(
          walletAddresses[0]
        );
        const serializedMessage: SerializedMessage = {
          Version: 0,
          To: walletAddresses[1],
          From: account.address.value,
          Nonce: 0,
          Value: "42",
          GasLimit: 0,
          GasFeeCap: "0",
          GasPremium: "0",
          Method: 0,
          Params: ""
        };
        const directSignature = await account.address.signMessage(
          new Message(serializedMessage)
        );
        const apiSignature: SerializedSignedMessage =
          await client.walletSignMessage(
            account.address.value,
            serializedMessage
          );
        assert.strictEqual(apiSignature.Signature.Type, SigType.SigTypeBLS);
        assert.strictEqual(
          directSignature.toString("base64"),
          apiSignature.Signature.Data
        );
      });

      it("fails to sign a Message via API for an unknown address", async () => {
        try {
          const address = Address.random();
          const serializedMessage: SerializedMessage = {
            Version: 0,
            To: walletAddresses[1],
            From: address.value,
            Nonce: 0,
            Value: "42",
            GasLimit: 0,
            GasFeeCap: "0",
            GasPremium: "0",
            Method: 0,
            Params: ""
          };
          await client.walletSignMessage(address.value, serializedMessage);
          assert.fail("Successfully signed a Message with an unknown address");
        } catch (e: any) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes(`due to not having the associated private key.`),
            e.message
          );
        }
      });
    });

    describe("Filecoin.WalletVerify", () => {
      it("verifies a valid signature", async () => {
        const account = await provider.blockchain.accountManager!.getAccount(
          walletAddresses[0]
        );
        const buffer = Buffer.from([0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]);
        const signature = await account.address.signBuffer(buffer);
        const serializedSignature: SerializedSignature = {
          Type: SigType.SigTypeBLS,
          Data: signature.toString("base64")
        };
        const isValid = await client.walletVerify(
          account.address.value,
          buffer.toString("base64"),
          serializedSignature
        );
        assert.strictEqual(isValid, true);
      });

      it("rejects an invalid signature", async () => {
        const account = await provider.blockchain.accountManager!.getAccount(
          walletAddresses[0]
        );
        const buffer = Buffer.from([0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]);
        const signature = await account.address.signBuffer(buffer);
        const serializedSignature: SerializedSignature = {
          Type: SigType.SigTypeBLS,
          Data: signature.toString("base64")
        };
        const isValid = await client.walletVerify(
          walletAddresses[1],
          buffer.toString("base64"),
          serializedSignature
        );
        assert.strictEqual(isValid, false);
      });
    });

    describe("Filecoin.WalletBalance", () => {
      let address: string;

      before(async () => {
        address = await client.walletDefaultAddress();
      });

      it("should return a balance for the default address", async () => {
        const balance = await client.walletBalance(address);
        assert.strictEqual(balance, "100000000000000000000");
      });

      it("should not return a balance for any other address", async () => {
        let otherAddress = Address.random().value;
        const balance = await client.walletBalance(otherAddress);
        assert.strictEqual(balance, "0");
      });
    });
  });
});
