import assert from "assert";
import {
  EIP1559FeeMarketRawTransaction,
  EIP1559FeeMarketDatabaseTx,
  EIP1559FeeMarketTransaction,
  EIP2930AccessListRawTransaction,
  EIP2930AccessListDatabaseTx,
  EIP2930AccessListTransaction,
  LegacyRawTransaction,
  LegacyTransaction,
  TransactionFactory,
  TransactionType,
  TypedDatabaseTransaction,
  Transaction,
  encodeWithPrefix,
  TypedRawTransaction
} from "../../transaction";
import { Common } from "@ethereumjs/common";
import Wallet from "../../ethereum/src/wallet";
import { decode } from "@ganache/rlp";
import { EthereumOptionsConfig } from "../../options";
import { BUFFER_EMPTY, Quantity } from "@ganache/utils";
import { SECP256K1_N } from "@ganache/secp256k1";

describe("@ganache/ethereum-transaction", async () => {
  const common = Common.custom(
    {
      name: "ganache",
      chainId: 1337,
      comment: "Local test network",
      bootstrapNodes: [],
      defaultHardfork: "grayGlacier"
    },
    { baseChain: "mainnet" }
  );
  // #region configure accounts and private keys in wallet
  const privKey = `0x${"46".repeat(32)}`;
  const privKeyBuf = Quantity.toBuffer(privKey);
  const options = EthereumOptionsConfig.normalize({
    wallet: {
      accounts: [
        { secretKey: privKey, balance: 100n },
        { secretKey: `0x${"46".repeat(31)}47`, balance: 100n },
        { secretKey: `0x${"46".repeat(31)}48`, balance: 100n }
      ]
    },
    logging: {
      logger: console
    }
  });
  const wallet = new Wallet(options.wallet, options.logging);
  const [from, to, accessListAcc] = wallet.addresses;

  // #endregion configure accounts and private keys in wallet

  // #region configure transaction constants
  // #region legacy transaction
  const untypedTx: Transaction = {
    from: from,
    to: to,
    gasPrice: "0xffff"
  };
  const typedLegacyTx: Transaction = {
    from: from,
    to: to,
    type: "0x0",
    gasPrice: "0xffff",
    nonce: "0x0"
  };
  const contractDeploymentTx: Transaction = {
    from: from,
    gasPrice: "0xffff",
    nonce: "0x0",
    data: "0x608060405234801561001057600080fd5b5061010e806100206000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c806360fe47b1146100515780636d4ce63c1461006c575b600080fd5b61005a61008a565b6040518082815260200191505060405180910390f35b61007a6004803603602081101561008057600080fd5b81019080803590602001909291905050506100a6565b005b60005481565b8060008190555050565b600080"
  };

  const UNTYPED_TX_START_BYTE = 0xc0; // all txs with first byte >= 0xc0 are untyped

  const rawLegacyStrTx =
    "0xf8618082ffff80945a17650be84f28ed583e93e6ed0c99b1d1fc1b348080820a95a0d9c2d3cb65d7079f528d28d782fe752ed698381481f7b91790e067ea335c1dc0a0731131778ae061aa29567cc6b36fe3528092b687fb68c3f529493fca200c711d";
  const rawLegacyStrTxChainId1234 =
    "0xf8618082ffff80945a17650be84f28ed583e93e6ed0c99b1d1fc1b3480808209c8a0c5e728f25ba7e771865291d91fe50945190d81ed2e240a4755370fb87dff349ea014e6102d81eb9a66307c487e662b0f9f91e78b203e06ba853fcf246fa49145db";

  const rawLegacyDbTx = decode<LegacyRawTransaction>(
    Buffer.from(rawLegacyStrTx.slice(2), "hex")
  );
  // #endregion legacy transaction

  // #region access list transactions
  const accessListStorageKey =
    "0x0000000000000000000000000000000000000000000000000000000000000004";
  const accessListTx: Transaction = {
    from: from,
    to: to,
    type: "0x1",
    gasPrice: "0xffff",
    accessList: [
      {
        address: accessListAcc,
        storageKeys: [accessListStorageKey]
      }
    ],
    nonce: "0x0"
  };

  const rawEIP2930StringData =
    "0x01f89c8205398082ffff80945a17650be84f28ed583e93e6ed0c99b1d1fc1b348080f838f7940efbd0bec0da8dcc0ad442a7d337e9cdc2dd6a54e1a0000000000000000000000000000000000000000000000000000000000000000480a096fe05ce879533fcdc1094e8eb18780024f93b5dec1160b542f396148f4eafdba06e4a230ccf316118fed883ff63bb072e112dbffeae06bb076c95d93ae731341c";
  const rawEIP2930StringDataChainId1234 =
    "0x01f89c8204d28082ffff80945a17650be84f28ed583e93e6ed0c99b1d1fc1b348080f838f7940efbd0bec0da8dcc0ad442a7d337e9cdc2dd6a54e1a0000000000000000000000000000000000000000000000000000000000000000401a02b78e5b29b6820ceb9d936b3144ec0e491c49c4c5923260cac8068e156b45a25a05e0863362858d72afa42ad5f35d2673793c4d1c18d93bc710b3b7212ecaed939";
  const eip2930Buf = Buffer.from(rawEIP2930StringData.slice(2), "hex");
  const rawEIP2930DBData: EIP2930AccessListDatabaseTx = [
    eip2930Buf.slice(0, 1),
    ...decode<EIP2930AccessListRawTransaction>(eip2930Buf.slice(1))
  ];
  // #endregion access list transactions

  //#region fee market transactions
  const feeMarketTx: Transaction = {
    from: from,
    to: to,
    type: "0x2",
    maxPriorityFeePerGas: "0xff",
    maxFeePerGas: "0xffff",
    accessList: [
      {
        address: accessListAcc,
        storageKeys: [accessListStorageKey]
      }
    ],
    nonce: "0x0"
  };

  const rawEIP1559StringData =
    "0x02f89e8205398081ff82ffff80945a17650be84f28ed583e93e6ed0c99b1d1fc1b348080f838f7940efbd0bec0da8dcc0ad442a7d337e9cdc2dd6a54e1a0000000000000000000000000000000000000000000000000000000000000000480a0274488defb0af8f0dcf1ecf4ff6bb60c0a7584a76db38575e0d57c9ec064c385a01707e5bdd3978be9aaa8375ed70186ea4a01cff5e9fc183855b198c4cb022e4c";
  const rawEIP1559StringDataChainId1234 =
    "0x02f89e8204d28081ff82ffff80945a17650be84f28ed583e93e6ed0c99b1d1fc1b348080f838f7940efbd0bec0da8dcc0ad442a7d337e9cdc2dd6a54e1a0000000000000000000000000000000000000000000000000000000000000000480a0090645667290e86dc0faa28cbcbaa2fcb641a8688010ee1fc74911eba0351e7fa03ebdbed56c38a0991508bd8c2ad1d266e835807a97f8e4ad658f82b8ed6b111a";
  const eip1559Buf = Buffer.from(rawEIP1559StringData.slice(2), "hex");
  const rawEIP1559DBData: EIP1559FeeMarketDatabaseTx = [
    eip1559Buf.slice(0, 1),
    ...decode<EIP1559FeeMarketRawTransaction>(eip1559Buf.slice(1))
  ];
  // #endregion fee market transactions
  // #endregion configure transaction constants

  describe("encodeWithPrefix", () => {
    it("encodes correctly", () => {
      const type = rawEIP1559DBData[0][0];
      const raw = rawEIP1559DBData.slice(1) as EIP1559FeeMarketRawTransaction;
      const result = encodeWithPrefix(type, raw);
      assert.strictEqual(result[0], type);
      assert.deepStrictEqual(decode(result.subarray(1)), raw);
    });
  });

  describe("TransactionFactory", () => {
    describe("LegacyTransaction type from factory", () => {
      let txFromRpc: LegacyTransaction;
      it("fails to parse legacy transaction without EIP-155 signature", () => {
        assert.throws(
          () =>
            <LegacyTransaction>(
              TransactionFactory.fromString(rawLegacyStrTxChainId1234, common)
            ),
          { message: "Invalid signature v value" }
        );
      });
      it("infers legacy transaction if type omitted", () => {
        txFromRpc = <LegacyTransaction>(
          TransactionFactory.fromRpc(untypedTx, common)
        );
        assert.strictEqual(txFromRpc.type.toString(), "0x0");
      });
      it("assumes legacy transaction if type unknown", () => {
        const unknownTypeTx: Transaction = {
          from: from,
          to: to,
          type: "0x55",
          gasPrice: "0xffff"
        };
        txFromRpc = <LegacyTransaction>(
          TransactionFactory.fromRpc(unknownTypeTx, common)
        );
        assert.strictEqual(txFromRpc.type.toString(), "0x0");
      });
      it(`assumes legacy transaction if type ${UNTYPED_TX_START_BYTE}`, () => {
        const unknownTypeTx = {
          from: from,
          to: to,
          type: "0x" + UNTYPED_TX_START_BYTE.toString(16),
          gasPrice: "0xffff"
        };
        txFromRpc = <LegacyTransaction>(
          TransactionFactory.fromRpc(unknownTypeTx, common)
        );
        assert.strictEqual(txFromRpc.type.toString(), "0x0");
      });
      it(`assumes legacy transaction if type > ${UNTYPED_TX_START_BYTE}`, () => {
        const unknownTypeTx = {
          from: from,
          to: to,
          type: "0x" + (UNTYPED_TX_START_BYTE + 1).toString(16),
          gasPrice: "0xffff"
        };
        txFromRpc = <LegacyTransaction>(
          TransactionFactory.fromRpc(unknownTypeTx, common)
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
      it("generates legacy transactions from type and raw data", async () => {
        const txFromDb = TransactionFactory.fromSafeTypeAndTxData(
          0,
          rawLegacyDbTx as TypedRawTransaction,
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
      it("normalizes an eip-2930 transaction to legacy when access list is omitted", async () => {
        const tempAccessListTx = JSON.parse(JSON.stringify(accessListTx)); // don't want to alter accessListTx
        tempAccessListTx.accessList = undefined;
        const txFromRpc = TransactionFactory.fromRpc(tempAccessListTx, common);
        assert.strictEqual(txFromRpc.type.toString(), "0x0");
      });

      describe("EIP-2", () => {
        it("rejects transactions with too-high S values only when EIP-2 is active", () => {
          const genesis = Common.custom(
            {
              name: "ganache",
              chainId: 1,
              comment: "Local test network",
              bootstrapNodes: [],
              // EIP-2 was in homestead, the first hardfork, so we need to create
              // a common at the genesis (aka chainstart) so we can test at a fork
              // where it is NOT active:
              defaultHardfork: "chainstart"
            },
            { baseChain: "mainnet" }
          );

          const tx = <LegacyTransaction>(
            TransactionFactory.fromRpc(typedLegacyTx, genesis)
          );
          tx.nonce = Quantity.from(1);
          tx.signAndHash(privKeyBuf);
          // Use `tx` to create a new transaction with "flipped" s and v values.
          // This is called transaction "malleability". By changing the
          // signature this way we still have a valid signature for the same
          // address! EIP-2 was introduced to forbid this.
          // See: https://ethereum.stackexchange.com/questions/55245/why-is-s-in-transaction-signature-limited-to-n-21

          // flip the `v` value:
          tx.v = Quantity.from(tx.v!.toBigInt() === 28n ? 27n : 28n);

          // flip the `s` value:
          tx.s = Quantity.from(SECP256K1_N - tx.s!.toBigInt()!);

          // convert to a JSON-RPC transaction:
          const flipTx = JSON.parse(JSON.stringify(tx.toJSON(genesis)));

          // make sure chainstart allows it (implicitly - by not throwing):
          const flipTxInstance = TransactionFactory.fromRpc(flipTx, genesis);

          // convert to a RAW transaction:
          const flipRaw = `0x${flipTxInstance.serialized.toString("hex")}`;

          // make sure chainstart allows it
          assert.doesNotThrow(() =>
            TransactionFactory.fromString(flipRaw, genesis)
          );

          const message =
            "Invalid Signature: s-values greater than secp256k1n/2 are considered invalid";
          // now check it against a common with a hardfork _after_ EIP-2
          assert.throws(() => TransactionFactory.fromRpc(flipTx, common), {
            message
          });
          assert.throws(() => TransactionFactory.fromString(flipRaw, common), {
            message
          });
        });
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
      it("fails to parse EIP-2390 transaction with wrong chainId", async () => {
        assert.throws(
          () =>
            <EIP2930AccessListTransaction>(
              TransactionFactory.fromString(
                rawEIP2930StringDataChainId1234,
                common
              )
            ),
          {
            message: "Invalid chain id (1234) for chain with id 1337.",
            code: -32000
          }
        );
      });
      it("generates eip2930 access list transactions from raw buffer data", async () => {
        const txFromDb = <EIP2930AccessListTransaction>(
          TransactionFactory.fromDatabaseTx(rawEIP2930DBData, common)
        );
        const key = txFromDb.accessListJSON[0].storageKeys[0];
        assert.strictEqual(txFromDb.type.toString(), "0x1");
        assert.strictEqual(key, accessListStorageKey);
      });
      it("generates eip2930 access list transactions from type and raw data", async () => {
        const txFromDb = <EIP2930AccessListTransaction>(
          TransactionFactory.fromSafeTypeAndTxData(
            rawEIP2930DBData[0][0],
            rawEIP2930DBData.slice(1) as TypedRawTransaction,
            common
          )
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

    describe("EIP1559FeeMarketTransaction type from factory", () => {
      it("generates eip1559 fee market transactions from rpc data", async () => {
        const txFromRpc = <EIP1559FeeMarketTransaction>(
          TransactionFactory.fromRpc(feeMarketTx, common)
        );
        const key = txFromRpc.accessListJSON[0].storageKeys[0];
        assert.strictEqual(txFromRpc.type.toString(), "0x2");
        assert.strictEqual(key, accessListStorageKey);
      });
      it("generates eip1559 fee market transactions from raw buffer data", async () => {
        const txFromDb = <EIP1559FeeMarketTransaction>(
          TransactionFactory.fromDatabaseTx(rawEIP1559DBData, common)
        );
        const key = txFromDb.accessListJSON[0].storageKeys[0];
        assert.strictEqual(txFromDb.type.toString(), "0x2");
        assert.strictEqual(key, accessListStorageKey);
      });
      it("generates eip1559 fee market transactions from type and raw data", async () => {
        const txFromDb = <EIP1559FeeMarketTransaction>(
          TransactionFactory.fromSafeTypeAndTxData(
            rawEIP1559DBData[0][0],
            rawEIP1559DBData.slice(1) as TypedRawTransaction,
            common
          )
        );
        const key = txFromDb.accessListJSON[0].storageKeys[0];
        assert.strictEqual(txFromDb.type.toString(), "0x2");
        assert.strictEqual(key, accessListStorageKey);
      });

      it("fails to parse EIP-1559 transaction with wrong chainId", async () => {
        assert.throws(
          () =>
            <EIP1559FeeMarketTransaction>(
              TransactionFactory.fromString(
                rawEIP1559StringDataChainId1234,
                common
              )
            ),
          {
            message: "Invalid chain id (1234) for chain with id 1337.",
            code: -32000
          }
        );
      });
      it("generates eip1559 fee market transactions from raw string", async () => {
        const txFromString = <EIP1559FeeMarketTransaction>(
          TransactionFactory.fromString(rawEIP1559StringData, common)
        );
        assert.strictEqual(txFromString.type.toString(), "0x2");
      });
      it("normalizes a legacy transaction to eip-1559 when gas price is omitted", async () => {
        const tempLegacyTx = JSON.parse(JSON.stringify(typedLegacyTx)); // don't want to alter accessListTx
        tempLegacyTx.gasPrice = undefined;
        const txFromRpc = TransactionFactory.fromRpc(tempLegacyTx, common);
        assert.strictEqual(txFromRpc.type.toString(), "0x2");
      });
      it("normalizes an eip-2930 transaction to eip-1559 when gas price is omitted", async () => {
        const tempAccessListTx = JSON.parse(JSON.stringify(accessListTx)); // don't want to alter accessListTx
        tempAccessListTx.gasPrice = undefined;
        const txFromRpc = TransactionFactory.fromRpc(tempAccessListTx, common);
        assert.strictEqual(txFromRpc.type.toString(), "0x2");
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
        //@ts-ignore
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
        assert.strictEqual(vmTx.nonce, 0n);
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
      describe("EIP-3860", () => {
        it("computes intrinstic gas correctly pre-shanghai (EIP-3860)", () => {
          const common = new Common({ chain: "mainnet", hardfork: "london" });
          const legacyDeployTx = Object.assign(
            { ...contractDeploymentTx },
            { type: "0x0" }
          );
          const tx = TransactionFactory.fromRpc(legacyDeployTx, common);
          const vmTx = tx.toVmTransaction();
          assert.strictEqual(vmTx.getBaseFee(), 55728n);
        });
        it("computes intrinstic gas correctly post-shanghai (EIP-3860)", () => {
          const common = new Common({ chain: "mainnet", hardfork: "shanghai" });
          const legacyDeployTx = Object.assign(
            { ...contractDeploymentTx },
            { type: "0x0" }
          );
          const tx = TransactionFactory.fromRpc(legacyDeployTx, common);
          const vmTx = tx.toVmTransaction();
          assert.strictEqual(vmTx.getBaseFee(), 55740n);
        });
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
      // when this value is omitted, we set a default
      assert.strictEqual(jsonTx.value.toString(), "0x0");
      assert.strictEqual(jsonTx.gas, tx.gas);
      assert.strictEqual(jsonTx.gasPrice, tx.gasPrice);
      assert.strictEqual(jsonTx.input, tx.data);
      // when this value is omitted, we set a default
      assert.strictEqual(jsonTx.input.toString(), "0x");
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
        //@ts-ignore
        tx.hash.toString(),
        "0x078395f79508111c9061f9983d387c8b7bfed990dfa098497aa4d34b0e47b265"
      );
    });
    describe("toVmTransaction", () => {
      const vmTx = tx.toVmTransaction();

      it("has a function to return the hash", () => {
        assert.notDeepStrictEqual(vmTx.hash().toString(), "");
      });
      it("has nonce property", () => {
        assert.strictEqual(vmTx.nonce, 0n);
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
      describe("EIP-3860", () => {
        it("computes intrinstic gas correctly pre-shanghai (EIP-3860)", () => {
          const common = new Common({ chain: "mainnet", hardfork: "london" });
          const eip2930DeployTx = Object.assign(
            { ...contractDeploymentTx },
            { type: "0x2" }
          );
          const tx = TransactionFactory.fromRpc(eip2930DeployTx, common);
          const vmTx = tx.toVmTransaction();
          assert.strictEqual(vmTx.getBaseFee(), 55728n);
        });
        it("computes intrinstic gas correctly post-shanghai (EIP-3860)", () => {
          const common = new Common({ chain: "mainnet", hardfork: "shanghai" });
          const eip2930DeployTx = Object.assign(
            { ...contractDeploymentTx },
            { type: "0x2" }
          );
          const tx = TransactionFactory.fromRpc(eip2930DeployTx, common);
          const vmTx = tx.toVmTransaction();
          assert.strictEqual(vmTx.getBaseFee(), 55740n);
        });
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
      // when this value is omitted, we set a default
      assert.strictEqual(jsonTx.value.toString(), "0x0");
      assert.strictEqual(jsonTx.gas, tx.gas);
      assert.strictEqual(jsonTx.gasPrice, tx.gasPrice);
      assert.strictEqual(jsonTx.input, tx.data);
      // when this value is omitted, we set a default
      assert.strictEqual(jsonTx.input.toString(), "0x");
      assert.strictEqual(jsonTx.v, tx.v);
      assert.strictEqual(jsonTx.r, tx.r);
      assert.strictEqual(jsonTx.s, tx.s);
    });
  });

  describe("EIP1559FeeMarketTransaction Type", () => {
    const tx = <EIP1559FeeMarketTransaction>(
      TransactionFactory.fromRpc(feeMarketTx, common)
    );
    it("can be signed and hashed", () => {
      assert.strictEqual(tx.hash, undefined);
      tx.signAndHash(privKeyBuf);
      assert.strictEqual(
        //@ts-ignore
        tx.hash.toString(),
        "0xabe11ba446440bd0ea9b9e9de9eb479ae4555455ec2244a80ef7a72eddf6fe17"
      );
    });
    describe("toVmTransaction", () => {
      const vmTx = tx.toVmTransaction();

      it("has a function to return the hash", () => {
        assert.notDeepStrictEqual(vmTx.hash().toString(), "");
      });
      it("has nonce property", () => {
        assert.strictEqual(vmTx.nonce, 0n);
      });
      it("has maxPriorityFeePerGas property", () => {
        assert.strictEqual(vmTx.maxPriorityFeePerGas.toString(), "255");
      });
      it("has maxFeePerGas property", () => {
        assert.strictEqual(vmTx.maxFeePerGas.toString(), "65535");
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
        assert.strictEqual(vmTx.supports(1559), true);
      });
      describe("EIP-3860", () => {
        it("computes intrinstic gas correctly pre-shanghai (EIP-3860)", () => {
          const common = new Common({ chain: "mainnet", hardfork: "london" });
          const eip1559DeployTx = Object.assign(
            { ...contractDeploymentTx },
            { type: "0x1" }
          );
          const vmTx = TransactionFactory.fromRpc(
            eip1559DeployTx,
            common
          ).toVmTransaction();
          assert.strictEqual(vmTx.getBaseFee(), 55728n);
        });
        it("computes intrinstic gas correctly post-shanghai (EIP-3860)", () => {
          const common = new Common({ chain: "mainnet", hardfork: "shanghai" });
          const eip1559DeployTx = Object.assign(
            { ...contractDeploymentTx },
            { type: "0x1" }
          );
          const vmTx = TransactionFactory.fromRpc(
            eip1559DeployTx,
            common
          ).toVmTransaction();
          assert.strictEqual(vmTx.getBaseFee(), 55740n);
        });
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
      // when this value is omitted, we set a default
      assert.strictEqual(jsonTx.value.toString(), "0x0");
      assert.strictEqual(jsonTx.gas, tx.gas);
      assert.strictEqual(jsonTx.maxPriorityFeePerGas, tx.maxPriorityFeePerGas);
      assert.strictEqual(jsonTx.maxFeePerGas, tx.maxFeePerGas);
      assert.strictEqual(jsonTx.gasPrice, tx.effectiveGasPrice);
      assert.strictEqual(jsonTx.input, tx.data);
      // when this value is omitted, we set a default
      assert.strictEqual(jsonTx.input.toString(), "0x");
      assert.strictEqual(jsonTx.v, tx.v);
      assert.strictEqual(jsonTx.r, tx.r);
      assert.strictEqual(jsonTx.s, tx.s);
    });
  });

  describe("Error and helper cases", () => {
    it("does not allow unsupported tx types from raw buffer data", async () => {
      // using 128 because max allowed type ever is 127
      const type = 128;
      const db: TypedDatabaseTransaction = [
        Buffer.from([type]),
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        [[BUFFER_EMPTY, [BUFFER_EMPTY]]],
        BUFFER_EMPTY,
        BUFFER_EMPTY,
        BUFFER_EMPTY
      ];
      assert.throws(
        () => {
          TransactionFactory.fromDatabaseTx(db, common);
        },
        {
          message: `Transactions with supplied type ${type} not supported`
        }
      );
      assert.throws(
        () => {
          TransactionFactory.fromSafeTypeAndTxData(
            db[0][0],
            db.slice(1) as TypedRawTransaction,
            common
          );
        },
        {
          message: `Transactions with supplied type ${type} not supported`
        }
      );
    });

    describe("checks for hardfork's support of transaction types", () => {
      describe("pre-berlin checks", () => {
        const preBerlin = Common.custom(
          {
            name: "ganache",
            chainId: 1337,
            comment: "Local test network",
            bootstrapNodes: [],
            defaultHardfork: "istanbul"
          },
          { baseChain: "mainnet" }
        );
        it("creates legacy transaction before berlin hardfork", () => {
          const txFromRpc = TransactionFactory.fromRpc(
            untypedTx,
            preBerlin
          ) as any;

          assert.strictEqual(txFromRpc.type.toString(), "0x0");
        });
        it("converts EIP2930AccessList RPC data to LegacyTransaction before berlin hardfork", () => {
          const txFromRpc = TransactionFactory.fromRpc(
            accessListTx,
            preBerlin
          ) as any;

          assert.strictEqual(txFromRpc.type.toString(), "0x0");
          assert.strictEqual(txFromRpc.accessList, undefined);
        });

        it("does not convert EIP2930AccessList raw database data to LegacyTransaction before berlin hardfork", () => {
          const txFromDb = TransactionFactory.fromDatabaseTx(
            rawEIP2930DBData,
            common
          ) as any;

          assert.strictEqual(txFromDb.type.toString(), "0x1");
          assert.deepStrictEqual(txFromDb.accessList.length, 1);
        });

        it("does not convert EIP2930AccessList raw string data to LegacyTransaction before berlin hardfork", () => {
          assert.throws(
            () =>
              TransactionFactory.fromString(
                rawEIP2930StringData,
                preBerlin
              ) as any,
            {
              message:
                "Could not decode transaction: invalid RLP: remainder must be zero"
            }
          );
        });

        it("converts EIP1559FeeMarket RPC data to LegacyTransaction before berlin hardfork", () => {
          const txFromRpc = TransactionFactory.fromRpc(
            feeMarketTx,
            preBerlin
          ) as any;

          assert.strictEqual(txFromRpc.type.toString(), "0x0");
          assert.strictEqual(txFromRpc.accessList, undefined);
        });
        it("does not convert EIP1559FeeMarket raw database data to LegacyTransaction", () => {
          const txFromDb = TransactionFactory.fromDatabaseTx(
            rawEIP1559DBData,
            common
          ) as any;

          assert.strictEqual(txFromDb.type.toString(), "0x2");
          assert.strictEqual(txFromDb.accessList.length, 1);
        });
        it("does not convert EIP1559FeeMarket raw string data to LegacyTransaction", () => {
          assert.throws(
            () =>
              TransactionFactory.fromString(rawEIP1559StringData, preBerlin),
            {
              message:
                "Could not decode transaction: invalid RLP: remainder must be zero"
            }
          );
        });
      });

      describe("pre-london checks", () => {
        const preLondon = Common.custom(
          {
            name: "ganache",
            chainId: 1337,
            comment: "Local test network",
            bootstrapNodes: [],
            defaultHardfork: "berlin"
          },
          { baseChain: "mainnet" }
        );
        it("creates legacy transaction before london hardfork", () => {
          const txFromRpc = TransactionFactory.fromRpc(
            untypedTx,
            preLondon
          ) as any;

          assert.strictEqual(txFromRpc.type.toString(), "0x0");
        });
        it("creates eip2930 transaction before london hardfork", () => {
          const txFromRpc = TransactionFactory.fromRpc(
            accessListTx,
            preLondon
          ) as any;

          assert.strictEqual(txFromRpc.type.toString(), "0x1");
        });
        it("throws if eip1559 transaction is sent before london hardfork", () => {
          assert.throws(() => {
            TransactionFactory.fromRpc(feeMarketTx, preLondon);
          });
        });
      });
    });
  });
});
