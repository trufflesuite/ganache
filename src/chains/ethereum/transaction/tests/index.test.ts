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
  const options = EthereumOptionsConfig.normalize({});
  const wallet = new Wallet(options.wallet);
  const [from, to, accessListAcc] = wallet.addresses;
  const fromBuf = Quantity.from(from).toBuffer();
  const fakePrivateKey = Buffer.concat([fromBuf, fromBuf.slice(0, 12)]);
  const accessListStorageKey =
    "0x0000000000000000000000000000000000000000000000000000000000000004";
  let rawEIP2930DBData: TypedDatabaseTransaction;
  let rawEIP2930StringData: string;

  describe("TransactionFactory", () => {
    describe("LegacyTransaction type from factory", () => {
      let txFromRpc: LegacyTransaction;
      it("infers legacy transaction if type ommitted", () => {
        const rpc: TypedRpcTransaction = {
          from: from,
          to: to,
          gasPrice: "0xffff"
        };
        txFromRpc = <LegacyTransaction>TransactionFactory.fromRpc(rpc, common);
        assert.strictEqual(txFromRpc.type.toString(), "0x0");
      });
      it("generates legacy transactions from rpc data", async () => {
        const rpc: TypedRpcTransaction = {
          from: from,
          to: to,
          type: "0x0",
          gasPrice: "0xffff"
        };
        txFromRpc = <LegacyTransaction>TransactionFactory.fromRpc(rpc, common);
        txFromRpc.signAndHash(fakePrivateKey);
        assert.strictEqual(txFromRpc.type.toString(), "0x0");
      });
      it("generates legacy transactions from raw buffer data", async () => {
        const db: TypedDatabaseTransaction = txFromRpc.toEthRawTransaction(
          txFromRpc.v.toBuffer(),
          txFromRpc.r.toBuffer(),
          txFromRpc.s.toBuffer()
        );
        const txFromDb = TransactionFactory.fromDatabaseTx(db, common);
        assert.strictEqual(txFromDb.type.toString(), "0x0");
      });
      it("generates legacy transactions from raw string", async () => {
        const str: string = "0x" + txFromRpc.serialized.toString("hex");
        const txFromString = TransactionFactory.fromString(str, common);
        assert.strictEqual(txFromString.type.toString(), "0x0");
      });
    });

    describe("EIP2930AccessListTransaction type from factory", () => {
      let txFromRpc: EIP2930AccessListTransaction;
      let key: string;

      it("generates eip2930 access list transactions from rpc data", async () => {
        const rpc: TypedRpcTransaction = {
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
        txFromRpc = <EIP2930AccessListTransaction>(
          TransactionFactory.fromRpc(rpc, common)
        );
        txFromRpc.signAndHash(fakePrivateKey);
        key = txFromRpc.accessListJSON[0].storageKeys[0];
        assert.strictEqual(txFromRpc.type.toString(), "0x1");
        assert.strictEqual(key, accessListStorageKey);
      });
      it("generates eip2930 access list transactions from raw buffer data", async () => {
        rawEIP2930DBData = txFromRpc.toEthRawTransaction(
          txFromRpc.v.toBuffer(),
          txFromRpc.r.toBuffer(),
          txFromRpc.s.toBuffer()
        );
        const txFromDb = <EIP2930AccessListTransaction>(
          TransactionFactory.fromDatabaseTx(rawEIP2930DBData, common)
        );
        key = txFromDb.accessListJSON[0].storageKeys[0];
        assert.strictEqual(txFromDb.type.toString(), "0x1");
        assert.strictEqual(key, accessListStorageKey);
      });

      it("generates eip2930 access list transactions from raw string", async () => {
        rawEIP2930StringData = "0x" + txFromRpc.serialized.toString("hex");
        const txFromString = <EIP2930AccessListTransaction>(
          TransactionFactory.fromString(rawEIP2930StringData, common)
        );
        key = txFromString.accessListJSON[0].storageKeys[0];
        assert.strictEqual(txFromString.type.toString(), "0x1");
        assert.strictEqual(key, accessListStorageKey);
      });
    });
  });

  describe("LegacyTransaction Type", () => {
    const rpc: TypedRpcTransaction = {
      from: from,
      to: to,
      type: "0x0",
      gasPrice: "0xffff"
    };
    const tx = <LegacyTransaction>TransactionFactory.fromRpc(rpc, common);
    it("can be signed and hashed", () => {
      // TODO: can we know the hash ahead of time if we supply the right data?
      assert.strictEqual(typeof tx.hash, "undefined");
      tx.signAndHash(fakePrivateKey);
      assert.strictEqual(typeof tx.hash, "object");
    });
    describe("toVmTransaction", () => {
      const vmTx = tx.toVmTransaction();
      it("has a function to return the hash", () => {
        assert.notDeepStrictEqual(vmTx.hash(), undefined);
      });
      it("has nonce property", () => {
        assert.notDeepStrictEqual(vmTx.nonce, undefined);
      });
      it("has gasPrice property", () => {
        assert.notDeepStrictEqual(vmTx.gasPrice, undefined);
      });
      it("has gasLimit property", () => {
        assert.notDeepStrictEqual(vmTx.gasLimit, undefined);
      });
      it("has to property", () => {
        assert.notDeepStrictEqual(vmTx.to, undefined);
      });
      it("has value property", () => {
        assert.notDeepStrictEqual(vmTx.value, undefined);
      });
      it("has data property", () => {
        assert.notDeepStrictEqual(vmTx.data, undefined);
      });
      it("has a function to get sender address", () => {
        assert.notDeepStrictEqual(vmTx.getSenderAddress(), undefined);
      });
      it("has a function to get base fee", () => {
        assert.notDeepStrictEqual(vmTx.getBaseFee(), undefined);
      });
      it("has a function to get base upfront cost", () => {
        assert.notDeepStrictEqual(vmTx.getUpfrontCost(), undefined);
      });
      it("has a function to check capability support", () => {
        assert.strictEqual(vmTx.supports(1559), false);
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
    const rpc: TypedRpcTransaction = {
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
    const tx = <EIP2930AccessListTransaction>(
      TransactionFactory.fromRpc(rpc, common)
    );
    const key = tx.accessListJSON[0].storageKeys[0];
    it("can be signed and hashed", () => {
      // TODO: can we know the hash ahead of time if we supply the right data?
      assert.strictEqual(typeof tx.hash, "undefined");
      tx.signAndHash(fakePrivateKey);
      assert.strictEqual(typeof tx.hash, "object");
    });
    describe("toVmTransaction", () => {
      const vmTx = tx.toVmTransaction();
      it("has a function to return the hash", () => {
        assert.notDeepStrictEqual(vmTx.hash(), undefined);
      });
      it("has nonce property", () => {
        assert.notDeepStrictEqual(vmTx.nonce, undefined);
      });
      it("has gasPrice property", () => {
        assert.notDeepStrictEqual(vmTx.gasPrice, undefined);
      });
      it("has gasLimit property", () => {
        assert.notDeepStrictEqual(vmTx.gasLimit, undefined);
      });
      it("has to property", () => {
        assert.notDeepStrictEqual(vmTx.to, undefined);
      });
      it("has value property", () => {
        assert.notDeepStrictEqual(vmTx.value, undefined);
      });
      it("has data property", () => {
        assert.notDeepStrictEqual(vmTx.data, undefined);
      });
      it("has AccessListJSON property", () => {
        assert.notDeepStrictEqual(vmTx.AccessListJSON, undefined);
      });
      it("has a function to get sender address", () => {
        assert.notDeepStrictEqual(vmTx.getSenderAddress(), undefined);
      });
      it("has a function to get base fee", () => {
        assert.notDeepStrictEqual(vmTx.getBaseFee(), undefined);
      });
      it("has a function to get base upfront cost", () => {
        assert.notDeepStrictEqual(vmTx.getUpfrontCost(), undefined);
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
      const db: TypedDatabaseTransaction = [
        Buffer.from("0x55"),
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
        TransactionFactory.fromDatabaseTx(db, common);
      });
    });
    it("does not allow unsupported tx types from raw string data", async () => {
      const str: string = "0x55";
      assert.throws(() => {
        TransactionFactory.fromString(str, common);
      });
    });
    it("gets tx type from raw data", async () => {
      const db: TypedDatabaseTransaction = [
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
      assert.strictEqual(TransactionFactory.typeOfRaw(db), LegacyTransaction);
    });

    describe("checks for hardfork's support of transaction types", () => {
      let txFromRpc;
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
        const rpc: TypedRpcTransaction = {
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
        txFromRpc = TransactionFactory.fromRpc(rpc, preBerlin);

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
