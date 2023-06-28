import { JsonRpcErrorCode } from "@ganache/utils";
import {
  EIP1559FeeMarketRpcTransaction,
  EIP2930AccessListRpcTransaction,
  Transaction,
  TransactionType
} from "../src/rpc-transaction";
import { rawFromRpc } from "../src/transaction-serialization";
import assert from "assert";
import { Data } from "@ganache/utils";
import { AccessList, AccessListBuffer } from "@ethereumjs/tx";

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
  const baseTx = {
    from: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    nonce: "0x1",
    gas: "0x945",
    to: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
    value: "0xde0b6b3a7640000",
    data: "0x48656c6c6f20776f726c64"
  };

  describe("serializeRpcForDb()", () => {
    // needs tests
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
      const legacyTx = { ...baseTx, gasPrice: "0x945945" };
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

    it("should convert an EIP-2930 transaction without accesslists to legacy", () => {
      const eip2930Tx = {
        ...baseTx,
        gasPrice: "0x945945",
        type: "0x1",
        chainId: "0x1"
      };
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

    it("should convert an EIP-2930 accesslist transaction", () => {
      const eip2930Tx = {
        ...baseTx,
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

    it("should convert an EIP-1559 fee market transaction", () => {
      const eip1559Tx = {
        ...baseTx,
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
