import { JsonRpcErrorCode, Quantity } from "@ganache/utils";
import {
  EIP1559FeeMarketRpcTransaction,
  EIP2930AccessListRpcTransaction,
  Transaction,
  TransactionType
} from "../src/rpc-transaction";
import {
  rawFromRpc,
  serializeForDb,
  serializeRpcForDb
} from "../src/transaction-serialization";
import assert from "assert";
import { Data } from "@ganache/utils";
import { AccessList, AccessListBuffer } from "@ethereumjs/tx";
import {
  EIP1559FeeMarketRawTransaction,
  EIP2930AccessListRawTransaction,
  LegacyRawTransaction
} from "../src/raw";
import { Address } from "@ganache/ethereum-address";

function assertBufferEqualsString(
  actual: Buffer,
  expected: string,
  message?: string
) {
  const expectedBuf = Data.toBuffer(expected);
  assert(Buffer.compare(actual, expectedBuf) === 0, message);
}

function assertAccessListEqualsBuffer(
  accessListBuffer: AccessListBuffer,
  accessList: AccessList
) {
  /*
  accessList is AccessListBuffer, which is made up of buffer values arranged as follows:
  [
    address,
    [ ....slots... ]
  ]
  */
  assert.strictEqual(accessListBuffer.length, 1);
  const [accessListAddress, accessListSlots] = accessListBuffer[0];
  assertBufferEqualsString(
    accessListAddress,
    accessList[0].address,
    "Unexpected accessList address"
  );

  assert.strictEqual(accessListSlots.length, 1);
  assertBufferEqualsString(
    accessListSlots[0],
    accessList[0].storageKeys[0],
    "Unexpected accessList slot"
  );
}

describe("transaction-serialization", () => {
  const baseRpcTx = {
    from: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    nonce: "0x1",
    gas: "0x945",
    to: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
    value: "0xde0b6b3a7640000",
    data: "0x48656c6c6f20776f726c64"
  };

  const legacyTx = { ...baseRpcTx, gasPrice: "0x945945" };
  const eip2930Tx = {
    ...baseRpcTx,
    gasPrice: "0x945945",
    type: "0x1",
    chainId: "0x1"
  };

  const eip1559Tx = {
    ...baseRpcTx,
    maxPriorityFeePerGas: "0x945945",
    maxFeePerGas: "0x549549",
    type: "0x1",
    chainId: "0x1",
    accessList: [
      {
        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        storageKeys: [
          "0x0000000000000000000000000000000000000000000000000000000000000001"
        ]
      }
    ]
  };

  const blockHash = Data.from(
    "0x7fe24cdff5b4bdcb277616483c850e67d0fd0705a9ac2d89e28a77403a162946",
    32
  );
  const blockNumber = Quantity.from("0xa0f98f");
  const transactionIndex = Quantity.from("0x1");
  const from = Address.from("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
  const txHash = Data.from(
    "0x11af86dbff8c977f7bb2d6d6619c9297814d588d47430c86ac794fafaf2cbbde"
  );
  const effectiveGasPrice = Quantity.from("0x945");
  const chainId = Buffer.from("01", "hex");

  describe("serializeRpcForDb()", () => {
    // this just exercizes the serializeRpcForDb() function, which depends on `rawFromRpc` and `serializeForDb` which are both tested below.
    it("should serialize a legacy RPC transaction", () => {
      const serialized = serializeRpcForDb(
        legacyTx,
        blockHash,
        blockNumber,
        transactionIndex
      );

      assert(
        Buffer.isBuffer(serialized),
        `Expected a Buffer, got ${serialized}`
      );
    });

    it("should serialize an EIP2930 accesslist transaction RPC transaction", () => {
      const serialized = serializeRpcForDb(
        eip2930Tx as EIP2930AccessListRpcTransaction,
        blockHash,
        blockNumber,
        transactionIndex
      );

      assert(
        Buffer.isBuffer(serialized),
        `Expected a Buffer, got ${serialized}`
      );
    });

    it("should serialize an EIP1559 fee market transaction RPC transaction", () => {
      const serialized = serializeRpcForDb(
        eip2930Tx as EIP2930AccessListRpcTransaction,
        blockHash,
        blockNumber,
        transactionIndex
      );

      assert(
        Buffer.isBuffer(serialized),
        `Expected a Buffer, got ${serialized}`
      );
    });
  });

  describe("serializeForDb()", () => {
    // this just exercizes the serializeForDb() function, which depends on RLP `encode()` function.
    // the behaviour of both `encode` and this are tested in higher level tests.
    const legacyRawTx: LegacyRawTransaction = [
      Buffer.from("01", "hex"), // nonce
      Buffer.from("0945", "hex"), // gasPrice
      Buffer.from("0101", "hex"), // gas
      Buffer.from("90F8bf6A479f320ead074411a4B0e7944Ea8c9C1", "hex"), // to
      Buffer.from("0de0b6b3a7640000", "hex"), // value
      Buffer.from("48656c6c6f20776f726c64", "hex"), // data
      Buffer.from("00", "hex"), // v
      Buffer.from(
        "7aa7c79312a0f5cc49862f70c2971d6022a7adc29c1509cf22f03ebcf0c31f45",
        "hex"
      ), // r
      Buffer.from(
        "113e899c92a3dcf9a1c2dc6f367f02fb398d7b4c777fed451228eda9d6f4f24d",
        "hex"
      ) // s
    ];

    it("should serialize a legacy transaction", () => {
      const serializableTx = {
        raw: legacyRawTx,
        from,
        hash: txHash,
        effectiveGasPrice,
        type: Quantity.from(TransactionType.Legacy)
      };

      const serialized = serializeForDb(
        serializableTx,
        blockHash,
        blockNumber,
        transactionIndex
      );

      assert(
        Buffer.isBuffer(serialized),
        `Expected a Buffer, got ${serialized}`
      );
    });

    it("should serialize an EIP2940AccessList transaction", () => {
      const accessListBuffer = [] as AccessListBuffer;
      const raw = [
        chainId,
        ...legacyRawTx.slice(0, 6),
        accessListBuffer,
        ...legacyRawTx.slice(6)
      ] as EIP2930AccessListRawTransaction;
      const serializableTx = {
        raw,
        from,
        hash: txHash,
        effectiveGasPrice,
        type: Quantity.from(TransactionType.EIP2930AccessList)
      };

      const serialized = serializeForDb(
        serializableTx,
        blockHash,
        blockNumber,
        transactionIndex
      );

      assert(
        Buffer.isBuffer(serialized),
        `Expected a Buffer, got ${serialized}`
      );
    });

    it("should serialize an EIP1559FeeMarket transaction", () => {
      const chainId = Buffer.from("01", "hex");
      const maxFeePerGas = Buffer.from("0945", "hex");
      const accessListBuffer = [] as AccessListBuffer;
      const raw = [
        chainId,
        ...legacyRawTx.slice(0, 2),
        maxFeePerGas,
        ...legacyRawTx.slice(2, 6),
        accessListBuffer,
        ...legacyRawTx.slice(6)
      ] as EIP1559FeeMarketRawTransaction;
      const serializableTx = {
        raw,
        from,
        hash: txHash,
        effectiveGasPrice,
        type: Quantity.from(TransactionType.EIP1559AccessList)
      };

      const serialized = serializeForDb(
        serializableTx,
        blockHash,
        blockNumber,
        transactionIndex
      );

      assert(
        Buffer.isBuffer(serialized),
        `Expected a Buffer, got ${serialized}`
      );
    });
  });

  describe("rawFromRpc()", () => {
    it("should throw with unsupported type", () => {
      const unsupportedType = 10 as TransactionType;
      const tx = {} as Transaction;

      assert.throws(
        () => {
          rawFromRpc(tx, unsupportedType);
        },
        {
          message: "Tx instantiation with supplied type not supported",
          code: JsonRpcErrorCode.METHOD_NOT_FOUND
        }
      );
    });

    it("should convert a legacy transaction", () => {
      const raw = rawFromRpc(legacyTx, TransactionType.Legacy);

      assert.strictEqual(raw.length, 9);
      const [nonce, gasPrice, gasLimit, to, value, data, v, r, s] = raw;
      assertBufferEqualsString(nonce, legacyTx.nonce, "Unexpected nonce");
      assertBufferEqualsString(
        gasPrice,
        legacyTx.gasPrice,
        "Unexpected gasLimit"
      );
      assertBufferEqualsString(gasLimit, legacyTx.gas, "Unexpected gasLimit");
      assertBufferEqualsString(value, legacyTx.value, "Unexpected value");
      assertBufferEqualsString(data, legacyTx.data, "Unexpected data");
      assertBufferEqualsString(to, legacyTx.to, "Unexpected to");
      assert.strictEqual(v.length, 0);
      assert.strictEqual(r.length, 0);
      assert.strictEqual(s.length, 0);
    });

    it("should convert an EIP2930 accesslist transaction without accesslists to legacy", () => {
      const raw = rawFromRpc(
        eip2930Tx as EIP2930AccessListRpcTransaction,
        TransactionType.EIP2930AccessList
      );

      assert.strictEqual(raw.length, 9);
      const [nonce, gasPrice, gasLimit, to, value, data, v, r, s] = raw;
      assertBufferEqualsString(nonce, eip2930Tx.nonce, "Unexpected nonce");
      assertBufferEqualsString(
        gasPrice,
        eip2930Tx.gasPrice,
        "Unexpected gasLimit"
      );
      assertBufferEqualsString(gasLimit, eip2930Tx.gas, "Unexpected gasLimit");
      assertBufferEqualsString(value, eip2930Tx.value, "Unexpected value");
      assertBufferEqualsString(data, eip2930Tx.data, "Unexpected data");
      assertBufferEqualsString(to, eip2930Tx.to, "Unexpected to");
      assert.strictEqual(v.length, 0);
      assert.strictEqual(r.length, 0);
      assert.strictEqual(s.length, 0);
    });

    it("should convert an EIP2930 accesslist transaction", () => {
      const eip2930Tx = {
        ...baseRpcTx,
        gasPrice: "0x945945",
        type: "0x1",
        chainId: "0x1",
        accessList: [
          {
            address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            storageKeys: [
              "0x0000000000000000000000000000000000000000000000000000000000000001"
            ]
          }
        ] as AccessList
      };
      const raw = rawFromRpc(
        eip2930Tx as EIP2930AccessListRpcTransaction,
        TransactionType.EIP2930AccessList
      );

      assert.strictEqual(raw.length, 11);
      const [
        chainId,
        nonce,
        gasPrice,
        gasLimit,
        to,
        value,
        data,
        accessList,
        v,
        r,
        s
      ] = raw;

      assertBufferEqualsString(
        chainId,
        eip2930Tx.chainId,
        "Unexpected chainId"
      );
      assertBufferEqualsString(nonce, eip2930Tx.nonce, "Unexpected nonce");
      assertBufferEqualsString(
        gasPrice,
        eip2930Tx.gasPrice,
        "Unexpected gasLimit"
      );
      assertBufferEqualsString(gasLimit, eip2930Tx.gas, "Unexpected gasLimit");
      assertBufferEqualsString(value, eip2930Tx.value, "Unexpected value");
      assertBufferEqualsString(data, eip2930Tx.data, "Unexpected data");
      assertBufferEqualsString(to, eip2930Tx.to, "Unexpected to");
      assert.strictEqual(v.length, 0);
      assert.strictEqual(r.length, 0);
      assert.strictEqual(s.length, 0);

      assertAccessListEqualsBuffer(
        accessList as AccessListBuffer,
        eip2930Tx.accessList
      );
    });

    it("should convert an EIP1559 fee market transaction", () => {
      const raw = rawFromRpc(
        eip1559Tx as EIP1559FeeMarketRpcTransaction,
        TransactionType.EIP1559AccessList
      );

      assert.strictEqual(raw.length, 12);
      const [
        chainId,
        nonce,
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasLimit,
        to,
        value,
        data,
        accessList,
        v,
        r,
        s
      ] = raw;

      assertBufferEqualsString(
        chainId,
        eip1559Tx.chainId,
        "Unexpected chainId"
      );
      assertBufferEqualsString(nonce, eip1559Tx.nonce, "Unexpected nonce");
      assertBufferEqualsString(
        maxFeePerGas,
        eip1559Tx.maxFeePerGas,
        "Unexpected maxFeePerGas"
      );
      assertBufferEqualsString(
        maxPriorityFeePerGas,
        eip1559Tx.maxPriorityFeePerGas,
        "Unexpected maxPriorityFeePerGas"
      );
      assertBufferEqualsString(gasLimit, eip1559Tx.gas, "Unexpected gasLimit");
      assertBufferEqualsString(value, eip1559Tx.value, "Unexpected value");
      assertBufferEqualsString(data, eip1559Tx.data, "Unexpected data");
      assertBufferEqualsString(to, eip1559Tx.to, "Unexpected to");
      assert.strictEqual(v.length, 0);
      assert.strictEqual(r.length, 0);
      assert.strictEqual(s.length, 0);

      assertAccessListEqualsBuffer(
        accessList,
        eip1559Tx.accessList as AccessList
      );
    });
  });
});
