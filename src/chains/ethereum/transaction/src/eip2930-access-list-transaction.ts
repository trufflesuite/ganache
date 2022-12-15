import {
  Data,
  Quantity,
  keccak,
  BUFFER_32_ZERO,
  BUFFER_EMPTY,
  BUFFER_ZERO,
  JsonRpcErrorCode,
  ecsign
} from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import type { Common } from "@ethereumjs/common";
import { Transaction } from "./rpc-transaction";
import { encodeRange, digest } from "@ganache/rlp";
import { RuntimeTransaction } from "./runtime-transaction";
import {
  EIP2930AccessListDatabasePayload,
  EIP2930AccessListDatabaseTx,
  GanacheRawExtraTx,
  TypedDatabaseTransaction
} from "./raw";
import { AccessList, AccessListBuffer, AccessLists } from "./access-lists";
import { computeIntrinsicsAccessListTx } from "./signing";
import {
  Capability,
  EIP2930AccessListTransactionJSON
} from "./transaction-types";
import { CodedError } from "@ganache/ethereum-utils";

const CAPABILITIES = [2718, 2930];

export class EIP2930AccessListTransaction extends RuntimeTransaction {
  public chainId: Quantity;
  public accessList: AccessListBuffer;
  public accessListJSON: AccessList;
  public accessListDataFee: bigint;
  public gasPrice: Quantity;
  public type: Quantity = Quantity.from("0x1");

  public constructor(
    data: EIP2930AccessListDatabasePayload | Transaction,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    super(data, common, extra);
    if (Array.isArray(data)) {
      this.chainId = Quantity.from(data[0]);
      this.nonce = Quantity.from(data[1]);
      this.gasPrice = this.effectiveGasPrice = Quantity.from(data[2]);
      this.gas = Quantity.from(data[3]);
      this.to = data[4].length == 0 ? null : Address.from(data[4]);
      this.value = Quantity.from(data[5]);
      this.data = Data.from(data[6]);
      const accessListData = AccessLists.getAccessListData(data[7]);
      this.accessList = accessListData.accessList;
      this.accessListJSON = accessListData.AccessListJSON;
      this.accessListDataFee = accessListData.dataFeeEIP2930;
      this.v = Quantity.from(data[8]);
      this.r = Quantity.from(data[9]);
      this.s = Quantity.from(data[10]);
      this.raw = [this.type.toBuffer(), ...data];

      if (!extra) {
        // TODO(hack): we use the presence of `extra` to determine if this data
        // come from the "database" or not. Transactions that come from the
        // database must not be validated since they may come from a fork.
        if (common.chainId() !== this.chainId.toBigInt()) {
          throw new CodedError(
            `Invalid chain id (${this.chainId.toBigInt()}) for chain with id ${common.chainId()}.`,
            JsonRpcErrorCode.INVALID_INPUT
          );
        }
        const { from, serialized, hash, encodedData, encodedSignature } =
          this.computeIntrinsics(this.v, this.raw);

        this.from = from;
        this.serialized = serialized;
        this.hash = hash;
        this.encodedData = encodedData;
        this.encodedSignature = encodedSignature;
      }
    } else {
      if (data.chainId) {
        this.chainId = Quantity.from(data.chainId);
        if (this.common.chainId() !== this.chainId.toBigInt()) {
          throw new CodedError(
            `Invalid chain id (${this.chainId.toNumber()}) for chain with id ${common.chainId()}.`,
            JsonRpcErrorCode.INVALID_INPUT
          );
        }
      } else {
        this.chainId = Quantity.from(common.chainId());
      }

      this.gasPrice = this.effectiveGasPrice = Quantity.from(data.gasPrice);
      const accessListData = AccessLists.getAccessListData(data.accessList);
      this.accessList = accessListData.accessList;
      this.accessListJSON = accessListData.AccessListJSON;
      this.accessListDataFee = accessListData.dataFeeEIP2930;
      this.validateAndSetSignature(data);
    }
  }

  public maxGasPrice() {
    return this.gasPrice;
  }

  public toJSON(_common?: Common): EIP2930AccessListTransactionJSON {
    return {
      hash: this.hash,
      type: this.type,
      chainId: this.chainId,
      nonce: this.nonce,
      blockHash: this.blockHash ? this.blockHash : null,
      blockNumber: this.blockNumber ? this.blockNumber : null,
      transactionIndex: this.index ? this.index : null,
      from: this.from,
      to: this.to,
      value: this.value,
      gas: this.gas,
      gasPrice: this.gasPrice,
      input: this.data,
      accessList: this.accessListJSON,
      v: this.v,
      r: this.r,
      s: this.s
    };
  }
  public static fromTxData(
    data: EIP2930AccessListDatabasePayload | Transaction,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    return new EIP2930AccessListTransaction(data, common, extra);
  }

  public toVmTransaction() {
    const data = this.data.toBuffer();
    return {
      hash: () => BUFFER_32_ZERO,
      nonce: this.nonce.toBigInt(),
      gasPrice: this.gasPrice.toBigInt(),
      gasLimit: this.gas.toBigInt(),
      to: this.to,
      value: this.value.toBigInt(),
      data,
      AccessListJSON: this.accessListJSON,
      getSenderAddress: () => this.from,
      /**
       * the minimum amount of gas the tx must have (DataFee + TxFee + Creation Fee)
       */
      getBaseFee: () => {
        const fee = this.calculateIntrinsicGas();
        return fee + this.accessListDataFee;
      },
      getUpfrontCost: () => {
        const { gas, gasPrice, value } = this;
        return gas.toBigInt() * gasPrice.toBigInt() + value.toBigInt();
      },
      supports: (capability: Capability) => {
        return CAPABILITIES.includes(capability);
      }
    };
  }
  /**
   * sign a transaction with a given private key, then compute and set the `hash`.
   *
   * @param privateKey - Must be 32 bytes in length
   */
  public signAndHash(privateKey: Buffer) {
    if (this.v != null) {
      throw new Error(
        "Internal Error: RuntimeTransaction `sign` called but transaction has already been signed"
      );
    }

    const typeBuf = this.type.toBuffer();
    const raw: EIP2930AccessListDatabaseTx = this.toEthRawTransaction(
      BUFFER_ZERO,
      BUFFER_ZERO,
      BUFFER_ZERO
    );
    const data = encodeRange(raw, 1, 8);
    const dataLength = data.length;

    const msgHash = keccak(
      Buffer.concat([typeBuf, digest([data.output], dataLength)])
    );
    const sig = ecsign(msgHash, privateKey);
    this.v = Quantity.from(sig.v);
    this.r = Quantity.from(sig.r);
    this.s = Quantity.from(sig.s);

    raw[9] = this.v.toBuffer();
    raw[10] = this.r.toBuffer();
    raw[11] = this.s.toBuffer();

    this.raw = raw;

    const encodedSignature = encodeRange(raw, 9, 3);
    // raw data is type concatenated with the rest of the data rlp encoded
    this.serialized = Buffer.concat([
      typeBuf,
      digest(
        [data.output, encodedSignature.output],
        dataLength + encodedSignature.length
      )
    ]);
    this.hash = Data.from(keccak(this.serialized));
    this.encodedData = data;
    this.encodedSignature = encodedSignature;
  }

  public toEthRawTransaction(
    v: Buffer,
    r: Buffer,
    s: Buffer
  ): EIP2930AccessListDatabaseTx {
    return [
      this.type.toBuffer(),
      this.chainId.toBuffer(),
      this.nonce.toBuffer(),
      this.gasPrice.toBuffer(),
      this.gas.toBuffer(),
      this.to ? this.to.toBuffer() : BUFFER_EMPTY,
      this.value.toBuffer(),
      this.data.toBuffer(),
      this.accessList,
      v,
      r,
      s
    ];
  }

  public computeIntrinsics(v: Quantity, raw: TypedDatabaseTransaction) {
    return computeIntrinsicsAccessListTx(v, <EIP2930AccessListDatabaseTx>raw);
  }

  public updateEffectiveGasPrice() {}
}
