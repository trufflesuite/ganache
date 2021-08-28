import assert from "assert";
import {
  EIP2930AccessListTransaction,
  LegacyTransaction,
  TransactionFactory,
  TypedDatabaseTransaction,
  TypedRpcTransaction
} from "../../transaction";
import Common from "@ethereumjs/common";
import Wallet from "../../ethereum/src/wallet";
import { EthereumOptionsConfig } from "../../options";
import { BUFFER_EMPTY, Quantity } from "@ganache/utils";
import { Buffer } from "buffer";

const toBuffRecurse = arr => {
  if (Array.isArray(arr[0])) {
    return arr.map(toBuffRecurse);
  } else {
    return Buffer.from(arr);
  }
};

describe("@ganache/ethereum-transaction", async () => {
  const common = Common.forCustomChain(
    "mainnet",
    {
      name: "ganache",
      chainId: 1337,
      comment: "Local test network",
      bootstrapNodes: []
    },
    "berlin"
  );
  // #region configure accounts and private keys in wallet
  const privKey = `0x${"46".repeat(32)}`;
  const privKeyBuf = Quantity.from(privKey).toBuffer();
  const options = EthereumOptionsConfig.normalize({
    wallet: {
      accounts: [
        { secretKey: privKey, balance: 100n },
        { secretKey: `0x${"46".repeat(31)}47`, balance: 100n },
        { secretKey: `0x${"46".repeat(31)}48`, balance: 100n }
      ]
    }
  });
  const wallet = new Wallet(options.wallet);
  const [from, to, accessListAcc] = wallet.addresses;
  // #endregion configure accounts and private keys in wallet

  // #region configure transaction constants
  // #region legacy transaction
  const untypedTx: TypedRpcTransaction = {
    from: from,
    to: to,
    gasPrice: "0xffff"
  };
  const typedLegacyTx: TypedRpcTransaction = {
    from: from,
    to: to,
    type: "0x0",
    gasPrice: "0xffff"
  };
  // prettier-ignore
  const rawLegacyDbTx: TypedDatabaseTransaction = <TypedDatabaseTransaction>(
    [[],[255, 255],[],[90,23,101,11,232,79,40,237,88,62,147,230,237,12,153,177,209,252,27,52],[],[],[10, 149],[217,194,211,203,101,215,7,159,82,141,40,215,130,254,117,46,214,152,56,20,129,247,185,23,144,224,103,234,51,92,29,192],[115,17,49,119,138,224,97,170,41,86,124,198,179,111,227,82,128,146,182,135,251,104,195,245,41,73,63,202,32,12,113,29]]
    .map(toBuffRecurse)
  );
  const rawLegacyStrTx =
    "0xf8618082ffff80945a17650be84f28ed583e93e6ed0c99b1d1fc1b348080820a95a0d9c2d3cb65d7079f528d28d782fe752ed698381481f7b91790e067ea335c1dc0a0731131778ae061aa29567cc6b36fe3528092b687fb68c3f529493fca200c711d";
  // #endregion legacy transaction

  // #region access list transactions
  const accessListStorageKey =
    "0x0000000000000000000000000000000000000000000000000000000000000004";
  const accessListTx: TypedRpcTransaction = {
    from: from,
    to: to,
    type: "0x1",
    gasPrice: "0xffff",
    accessList: [
      {
        address: accessListAcc,
        storageKeys: [accessListStorageKey]
      }
    ]
  };
  // prettier-ignore
  const rawEIP2930DBData: TypedDatabaseTransaction = <TypedDatabaseTransaction>(
    [[1],[],[],[255, 255],[],[90, 23, 101, 11, 232, 79, 40, 237, 88, 62, 147, 230, 237, 12, 153, 177, 209, 252, 27, 52],[],[],[[[14, 251, 208, 190, 192, 218, 141, 204, 10, 212, 66, 167, 211, 55, 233, 205, 194, 221, 106, 84],[[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4]]]],[10, 150],[175, 186, 135, 199, 21, 101, 226, 38, 189, 123, 159, 186, 181, 35, 76, 230, 46, 196, 121, 243, 86, 249, 138, 173, 150, 248, 17, 66, 14, 164, 72, 247],[6, 236, 10, 9, 245, 8, 218, 76, 18, 229, 45, 63, 152, 73, 152, 229, 77, 250, 8, 46, 107, 121, 96, 80, 167, 58, 138, 1, 187, 157, 193, 14]]
    .map(toBuffRecurse)
  );
  const rawEIP2930StringData =
    "0x01f89c808082ffff80945a17650be84f28ed583e93e6ed0c99b1d1fc1b348080f838f7940efbd0bec0da8dcc0ad442a7d337e9cdc2dd6a54e1a00000000000000000000000000000000000000000000000000000000000000004820a96a0afba87c71565e226bd7b9fbab5234ce62ec479f356f98aad96f811420ea448f7a006ec0a09f508da4c12e52d3f984998e54dfa082e6b796050a73a8a01bb9dc10e";
  // #endregion access list transactions
  // #endregion configure transaction constants

  describe("TransactionFactory", () => {
    describe("LegacyTransaction type from factory", () => {
      let txFromRpc: LegacyTransaction;
      it("infers legacy transaction if type ommitted", () => {
        txFromRpc = <LegacyTransaction>(
          TransactionFactory.fromRpc(untypedTx, common)
        );
        assert.strictEqual(txFromRpc.type.toString(), "0x0");
      });
      it("generates legacy transactions from rpc data", async () => {
        txFromRpc = <LegacyTransaction>(
          TransactionFactory.fromRpc(typedLegacyTx, common)
        );
        assert.strictEqual(txFromRpc.type.toString(), "0x0");
      });
      it("generates legacy transactions from raw buffer data", async () => {
        const txFromDb = TransactionFactory.fromDatabaseTx(
          rawLegacyDbTx,
          common
        );
        assert.strictEqual(txFromDb.type.toString(), "0x0");
      });
      it("generates legacy transactions from raw string", async () => {
        const txFromString = TransactionFactory.fromString(
          rawLegacyStrTx,
          common
        );
        assert.strictEqual(txFromString.type.toString(), "0x0");
      });
    });

    describe("EIP2930AccessListTransaction type from factory", () => {
      it("generates eip2930 access list transactions from rpc data", async () => {
        const txFromRpc = <EIP2930AccessListTransaction>(
          TransactionFactory.fromRpc(accessListTx, common)
        );
        const key = txFromRpc.accessListJSON[0].storageKeys[0];
        assert.strictEqual(txFromRpc.type.toString(), "0x1");
        assert.strictEqual(key, accessListStorageKey);
      });
      it("generates eip2930 access list transactions from raw buffer data", async () => {
        const txFromDb = <EIP2930AccessListTransaction>(
          TransactionFactory.fromDatabaseTx(rawEIP2930DBData, common)
        );
        const key = txFromDb.accessListJSON[0].storageKeys[0];
        assert.strictEqual(txFromDb.type.toString(), "0x1");
        assert.strictEqual(key, accessListStorageKey);
      });

      it("generates eip2930 access list transactions from raw string", async () => {
        const txFromString = <EIP2930AccessListTransaction>(
          TransactionFactory.fromString(rawEIP2930StringData, common)
        );
        const key = txFromString.accessListJSON[0].storageKeys[0];
        assert.strictEqual(txFromString.type.toString(), "0x1");
        assert.strictEqual(key, accessListStorageKey);
      });
    });
  });

  describe("LegacyTransaction Type", () => {
    const tx = <LegacyTransaction>(
      TransactionFactory.fromRpc(typedLegacyTx, common)
    );
    it("can be signed and hashed", () => {
      assert.strictEqual(tx.hash, undefined);
      tx.signAndHash(privKeyBuf);
      assert.strictEqual(
        tx.hash.toString(),
        "0x35886e9379da43140070da4b4d39e0e6fa246cc3dec7b5b51107e5dd722f671b"
      );
    });
    describe("toVmTransaction", () => {
      const vmTx = tx.toVmTransaction();
      it("has a function to return the hash", () => {
        assert.notDeepStrictEqual(vmTx.hash().toString(), "");
      });
      it("has nonce property", () => {
        assert.strictEqual(vmTx.nonce.toString(), "0");
      });
      it("has gasPrice property", () => {
        assert.strictEqual(vmTx.gasPrice.toString(), "65535");
      });
      it("has gasLimit property", () => {
        assert.strictEqual(vmTx.gasLimit.toString(), "0");
      });
      it("has to property", () => {
        assert.strictEqual("0x" + vmTx.to.buf.toString("hex"), to);
      });
      it("has value property", () => {
        assert.strictEqual(vmTx.value.toString(), "0");
      });
      it("has data property", () => {
        assert.strictEqual(vmTx.data.toString(), "");
      });
      it("has a function to get sender address", () => {
        assert.strictEqual(
          "0x" + vmTx.getSenderAddress().buf.toString("hex"),
          from
        );
      });
      it("has a function to get base fee", () => {
        assert.strictEqual(vmTx.getBaseFee().toString(), "21000");
      });
      it("has a function to get base upfront cost", () => {
        assert.strictEqual(vmTx.getUpfrontCost().toString(), "0");
      });
      it("has a function to check capability support", () => {
        assert.strictEqual(vmTx.supports(2930), false);
      });
    });
    it("can be converted to JSON", () => {
      const jsonTx = tx.toJSON();
      assert.strictEqual(jsonTx.type, tx.type);
      assert.strictEqual(jsonTx.hash, tx.hash);
      assert.strictEqual(jsonTx.nonce, tx.nonce);
      assert.strictEqual(jsonTx.blockHash, null);
      assert.strictEqual(jsonTx.blockNumber, null);
      assert.strictEqual(jsonTx.transactionIndex, null);
      assert.strictEqual(jsonTx.from, tx.from);
      assert.strictEqual(jsonTx.to, tx.to);
      assert.strictEqual(jsonTx.value, tx.value);
      assert.strictEqual(jsonTx.gas, tx.gas);
      assert.strictEqual(jsonTx.gasPrice, tx.gasPrice);
      assert.strictEqual(jsonTx.input, tx.data);
      assert.strictEqual(jsonTx.v, tx.v);
      assert.strictEqual(jsonTx.r, tx.r);
      assert.strictEqual(jsonTx.s, tx.s);
    });
  });
  describe("EIP2930AccessListTransaction Type", () => {
    const tx = <EIP2930AccessListTransaction>(
      TransactionFactory.fromRpc(accessListTx, common)
    );
    it("can be signed and hashed", () => {
      assert.strictEqual(tx.hash, undefined);
      tx.signAndHash(privKeyBuf);
      assert.strictEqual(
        tx.hash.toString(),
        "0xf99c33b548c1ee4a4602398b67f25675f74ea37bedb9d3d69aeea65b60186a98"
      );
    });
    describe("toVmTransaction", () => {
      const vmTx = tx.toVmTransaction();

      it("has a function to return the hash", () => {
        assert.notDeepStrictEqual(vmTx.hash().toString(), "");
      });
      it("has nonce property", () => {
        assert.strictEqual(vmTx.nonce.toString(), "0");
      });
      it("has gasPrice property", () => {
        assert.strictEqual(vmTx.gasPrice.toString(), "65535");
      });
      it("has gasLimit property", () => {
        assert.strictEqual(vmTx.gasLimit.toString(), "0");
      });
      it("has to property", () => {
        assert.strictEqual("0x" + vmTx.to.buf.toString("hex"), to);
      });
      it("has value property", () => {
        assert.strictEqual(vmTx.value.toString(), "0");
      });
      it("has data property", () => {
        assert.strictEqual(vmTx.data.toString(), "");
      });
      it("has a function to get sender address", () => {
        assert.strictEqual(
          "0x" + vmTx.getSenderAddress().buf.toString("hex"),
          from
        );
      });
      it("has a function to get base fee", () => {
        assert.strictEqual(vmTx.getBaseFee().toString(), "25300");
      });
      it("has a function to get base upfront cost", () => {
        assert.strictEqual(vmTx.getUpfrontCost().toString(), "0");
      });
      it("has a function to check capability support", () => {
        assert.strictEqual(vmTx.supports(2930), true);
      });
    });
    it("can be converted to JSON", () => {
      const jsonTx = tx.toJSON();
      //assert.strictEqual(jsonTx.type, txFromRpc.type);
      assert.strictEqual(jsonTx.hash, tx.hash);
      assert.strictEqual(jsonTx.nonce, tx.nonce);
      assert.strictEqual(jsonTx.blockHash, null);
      assert.strictEqual(jsonTx.blockNumber, null);
      assert.strictEqual(jsonTx.transactionIndex, null);
      assert.strictEqual(jsonTx.from, tx.from);
      assert.strictEqual(jsonTx.to, tx.to);
      assert.strictEqual(jsonTx.value, tx.value);
      assert.strictEqual(jsonTx.gas, tx.gas);
      assert.strictEqual(jsonTx.gasPrice, tx.gasPrice);
      assert.strictEqual(jsonTx.input, tx.data);
      assert.strictEqual(jsonTx.v, tx.v);
      assert.strictEqual(jsonTx.r, tx.r);
      assert.strictEqual(jsonTx.s, tx.s);
    });
  });
  describe("Error and helper cases", () => {
    it("does not allow unsupported tx types from rpc data", async () => {
      const rpc: TypedRpcTransaction = {
        from: from,
        to: to,
        type: "0x55",
        gasPrice: "0xffff"
      };
      assert.throws(() => {
        TransactionFactory.fromRpc(rpc, common);
      });
    });
    it("does not allow unsupported tx types from raw buffer data", async () => {
      const db = [
        Buffer.from("0x55"),
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY
      ];
      assert.throws(() => {
        TransactionFactory.fromDatabaseTx(
          db as TypedDatabaseTransaction,
          common
        );
      });
    });
    it("does not allow unsupported tx types from raw string data", async () => {
      const str: string = "0x55";
      assert.throws(() => {
        TransactionFactory.fromString(str, common);
      });
    });
    it("gets tx type from raw data", async () => {
      const db = [
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY
      ];
      assert.strictEqual(
        TransactionFactory.typeOfRaw(db as TypedDatabaseTransaction),
        LegacyTransaction
      );
    });

    describe("checks for hardfork's support of transaction types", () => {
      const preBerlin = Common.forCustomChain(
        "mainnet",
        {
          name: "ganache",
          chainId: 1337,
          comment: "Local test network",
          bootstrapNodes: []
        },
        "istanbul"
      );
      it("converts EIP2930AccessList RPC data to LegacyTransaction before berlin hardfork", () => {
        const txFromRpc = TransactionFactory.fromRpc(
          accessListTx,
          preBerlin
        ) as any;

        assert.strictEqual(txFromRpc.type.toString(), "0x0");
        assert.strictEqual(txFromRpc.accessList, undefined);
      });
      it("converts EIP2930AccessList raw database data to LegacyTransaction before berlin hardfork", () => {
        const txFromDb = TransactionFactory.fromDatabaseTx(
          rawEIP2930DBData,
          preBerlin
        ) as any;

        assert.strictEqual(txFromDb.type.toString(), "0x0");
        assert.strictEqual(txFromDb.accessList, undefined);
      });

      it("converts EIP2930AccessList raw string data to LegacyTransaction before berlin hardfork", () => {
        const txFromString = TransactionFactory.fromString(
          rawEIP2930StringData,
          preBerlin
        ) as any;

        assert.strictEqual(txFromString.type.toString(), "0x0");
        assert.strictEqual(txFromString.accessList, undefined);
      });
    });
  });
});
