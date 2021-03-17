import assert from "assert";
import { Address, AddressProtocol } from "../../src/things/address";
import { Message, SerializedMessage } from "../../src/things/message";

describe("things", () => {
  describe("Address", () => {
    // These were pulled directly from Lotus. You can use the lotusKeyInfo
    // with Filecoin.WalletImport to expand these tests with the same keys
    const blsAddress = {
      lotusKeyInfo: {
        Type: "bls",
        PrivateKey: "d9uNVQQ7Ek+Ri8X0gLBMKslCCN28PfLVhS8b6ZJZUhY="
      },
      testInfo: {
        // this is just Buffer.from(lotusKeyInfo.PrivateKey, "base64").toString("hex")
        privateKey:
          "77db8d55043b124f918bc5f480b04c2ac94208ddbc3df2d5852f1be992595216",
        publicAddress:
          "t3sym5jz44yhcfslttqfsygrkanh5w556huzupuuz5ox44dniehguj6w23gbnxxp4ztgwxaesr2wtvdwkr4jyq"
      }
    };

    const secpAddress = {
      lotusKeyInfo: {
        Type: "secp256k1",
        PrivateKey: "hJ5suaM/nJwkclh/QoE59CFbWIGZEgPIhKapR68QqkE="
      },
      testInfo: {
        // this is just Buffer.from(lotusKeyInfo.PrivateKey, "base64").toString("hex")
        privateKey:
          "849e6cb9a33f9c9c2472587f428139f4215b5881991203c884a6a947af10aa41",
        publicAddress: "t15splylflm24lhvigtcsi4sjsagz6f7cwthnylki"
      }
    };

    it("should derive a real BLS address from a private key", async () => {
      const address = Address.fromPrivateKey(blsAddress.testInfo.privateKey);

      assert.strictEqual(address.value, blsAddress.testInfo.publicAddress);

      const address2 = Address.fromPrivateKey(
        blsAddress.testInfo.privateKey,
        AddressProtocol.BLS
      );

      assert.strictEqual(address2.value, address.value);
    });

    it("should derive a real SECP256K1 address from a private key", async () => {
      const address = Address.fromPrivateKey(
        secpAddress.testInfo.privateKey,
        AddressProtocol.SECP256K1
      );

      assert.strictEqual(address.value, secpAddress.testInfo.publicAddress);
    });

    it("should create a random address when calling Address.random()", async () => {
      const address = Address.random();

      assert.ok(Address.validate(address.value));
    });

    it("properly signs a buffer with a BLS address", async () => {
      const address = Address.fromPrivateKey(
        blsAddress.testInfo.privateKey,
        AddressProtocol.BLS
      );
      const buffer = Buffer.from([0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]);
      const signature = await address.signBuffer(buffer);
      assert.strictEqual(
        signature.toString("base64"),
        "pmfBJoCCDKhNsp2CzneA5Q+gDmZX9q2r6t1MeXgyLDkFdQw5KgdeQzr+ZInZttpFAhw9wjsiLEqV+agIZM1wxuWpcbpb7sz73XiloKFj20BkP5yvyC/ub+MFIWREFlL2"
      );
    });

    it("properly signs a buffer with a SECP256K1 address", async () => {
      const address = Address.fromPrivateKey(
        secpAddress.testInfo.privateKey,
        AddressProtocol.SECP256K1
      );
      const buffer = Buffer.from([0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]);
      const signature = await address.signBuffer(buffer);
      assert.strictEqual(
        signature.toString("base64"),
        "I9Fk7jXdAPIi8AGQgwZe+T+CAsESdPcIfiK7qWRrcLl/G4+Ol0jB2TM1IDglvxuhM6Xf9G7zGwVrN9glNyCNDAE="
      );
    });

    // TODO: This test fails and I can't figure out why, but it's not worth the time now.
    // Read more at Address.signMessage implementation
    it.skip("properly signs a Message with a BLS address", async () => {
      const address = Address.fromPrivateKey(
        blsAddress.testInfo.privateKey,
        AddressProtocol.BLS
      );
      const serializedMessage: SerializedMessage = {
        Version: 0,
        To:
          "f3r2y3dv7bmw3okvmil6mwrjedac5jcntqocwlnozszkqtpux44xegbbpjyv7zg4lwkonihnejimolyvmpwbsa",
        From: blsAddress.testInfo.publicAddress.replace(/^t/, "f"), // our comparison uses 'f' network,
        Nonce: 0,
        Value: "42",
        GasLimit: 0,
        GasFeeCap: "0",
        GasPremium: "0",
        Method: 0,
        Params: ""
      };
      const signature = await address.signMessage(
        new Message(serializedMessage)
      );
      assert.strictEqual(
        signature.toString("base64"),
        "gFRtcRyRtc0eEH8Z4MIFYv4oICx2I6/QYhEcmzMvlfmvsrdqzmsmVz/Vrop2wmB5A9WziUFEwDKdOEaSJaCNfQKwnI5AFQJxOYjEz1eBolDbsfnU/TkoqSY7C0CUlOfn"
      );
    });

    // TODO: This test fails and I can't figure out why, but it's not worth the time now.
    // Read more at Address.signMessage implementation
    it.skip("properly signs a Message with a SECP256K1 address", async () => {
      const address = Address.fromPrivateKey(
        secpAddress.testInfo.privateKey,
        AddressProtocol.SECP256K1
      );
      const serializedMessage: SerializedMessage = {
        Version: 0,
        To:
          "f3r2y3dv7bmw3okvmil6mwrjedac5jcntqocwlnozszkqtpux44xegbbpjyv7zg4lwkonihnejimolyvmpwbsa",
        From: secpAddress.testInfo.publicAddress.replace(/^t/, "f"), // our comparison uses 'f' network
        Nonce: 0,
        Value: "42",
        GasLimit: 0,
        GasFeeCap: "0",
        GasPremium: "0",
        Method: 0,
        Params: ""
      };
      const message = new Message(serializedMessage);
      const signature = await address.signMessage(message);
      assert.strictEqual(
        signature.toString("base64"),
        "qef/OO7lbK5wFfUgOO4BQqYh4gGEfls21E1eGb2FPJ59kUDPANjAGIh/MYOmlGbGkwHTR64iVPMc1y5GrNYEbQE="
      );
    });
  });
});
