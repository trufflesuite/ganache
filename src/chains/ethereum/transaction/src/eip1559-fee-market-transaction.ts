import {
  Data,
  Quantity,
  keccak,
  BUFFER_32_ZERO,
  BUFFER_ZERO,
  JsonRpcErrorCode
} from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import type Common from "@ethereumjs/common";
import { BN } from "ethereumjs-util";
import { Transaction } from "./rpc-transaction";
import { encodeRange, digest } from "@ganache/rlp";
import { RuntimeTransaction } from "./runtime-transaction";
import {
  EIP1559FeeMarketDatabasePayload,
  EIP1559FeeMarketDatabaseTx,
  GanacheRawExtraTx,
  TypedDatabaseTransaction
} from "./raw";
import { AccessList, AccessListBuffer, AccessLists } from "./access-lists";
import { computeIntrinsicsFeeMarketTx } from "./signing";
import {
  Capability,
  EIP1559FeeMarketTransactionJSON
} from "./transaction-types";
import secp256k1 from "@ganache/secp256k1";
import { CodedError } from "@ganache/ethereum-utils";

function ecsign(msgHash: Uint8Array, privateKey: Uint8Array) {
  const object = { signature: new Uint8Array(64), recid: null };
  const status = secp256k1.ecdsaSign(object, msgHash, privateKey);
  if (status === 0) {
    const buffer = object.signature.buffer;
    const r = Buffer.from(buffer, 0, 32);
    const s = Buffer.from(buffer, 32, 32);
    return { r, s, v: object.recid };
  } else {
    throw new Error(
      "The nonce generation function failed, or the private key was invalid"
    );
  }
}

const CAPABILITIES = [2718, 2930, 1559];

export class EIP1559FeeMarketTransaction extends RuntimeTransaction {
  public chainId: Quantity;
  public maxPriorityFeePerGas: Quantity;
  public maxFeePerGas: Quantity;
  public accessList: AccessListBuffer;
  public accessListJSON: AccessList;
  public accessListDataFee: bigint;
  public type: Quantity = Quantity.from("0x2");

  public constructor(
    data: EIP1559FeeMarketDatabasePayload | Transaction,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    super(data, common, extra);
    if (Array.isArray(data)) {
      this.chainId = Quantity.from(data[0]);
      this.nonce = Quantity.from(data[1]);
      this.maxPriorityFeePerGas = Quantity.from(data[2]);
      this.maxFeePerGas = Quantity.from(data[3]);
      this.gas = Quantity.from(data[4]);
      this.to = data[5].length == 0 ? Quantity.Empty : Address.from(data[5]);
      this.value = Quantity.from(data[6]);
      this.data = Data.from(data[7]);
      const accessListData = AccessLists.getAccessListData(data[8]);
      this.accessList = accessListData.accessList;
      this.accessListJSON = accessListData.AccessListJSON;
      this.accessListDataFee = accessListData.dataFeeEIP2930;
      this.v = Quantity.from(data[9]);
      this.r = Quantity.from(data[10]);
      this.s = Quantity.from(data[11]);
      this.raw = [this.type.toBuffer(), ...data];

      if (!extra) {
        // TODO(hack): we use the presence of `extra` to determine if this data
        // come from the "database" or not. Transactions that come from the
        // database must not be validated since they may come from a fork.
        if (common.chainId() !== this.chainId.toNumber()) {
          throw new CodedError(
            `Invalid chain id (${this.chainId.toNumber()}) for chain with id ${common.chainId()}.`,
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
      } else {
        this.chainId = Quantity.from(common.chainIdBN().toArrayLike(Buffer));
      }

      this.maxPriorityFeePerGas = Quantity.from(data.maxPriorityFeePerGas);
      this.maxFeePerGas = Quantity.from(data.maxFeePerGas);
      const accessListData = AccessLists.getAccessListData(data.accessList);
      this.accessList = accessListData.accessList;
      this.accessListJSON = accessListData.AccessListJSON;
      this.accessListDataFee = accessListData.dataFeeEIP2930;
      this.validateAndSetSignature(data);
    }
  }

  public maxGasPrice() {
    return this.maxFeePerGas;
  }

  public toJSON(_common?: Common): EIP1559FeeMarketTransactionJSON {
    return {
      type: this.type,
      hash: this.hash,
      chainId: this.chainId,
      nonce: this.nonce,
      blockHash: this.blockHash ? this.blockHash : null,
      blockNumber: this.blockNumber ? this.blockNumber : null,
      transactionIndex: this.index ? this.index : null,
      from: this.from,
      to: this.to.isNull() ? null : this.to,
      value: this.value,
      maxPriorityFeePerGas: this.maxPriorityFeePerGas,
      maxFeePerGas: this.maxFeePerGas,
      gasPrice: this.effectiveGasPrice,
      gas: this.gas,
      input: this.data,
      accessList: this.accessListJSON,
      v: this.v,
      r: this.r,
      s: this.s
    };
  }

  public static fromTxData(
    data: EIP1559FeeMarketDatabasePayload | Transaction,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    return new EIP1559FeeMarketTransaction(data, common, extra);
  }

  public toVmTransaction() {
    const from = this.from;
    const sender = from.toBuffer();
    const to = this.to.toBuffer();
    const data = this.data.toBuffer();
    return {
      hash: () => BUFFER_32_ZERO,
      nonce: new BN(this.nonce.toBuffer()),
      maxPriorityFeePerGas: new BN(this.maxPriorityFeePerGas.toBuffer()),
      maxFeePerGas: new BN(this.maxFeePerGas.toBuffer()),
      gasLimit: new BN(this.gas.toBuffer()),
      to:
        to.length === 0
          ? null
          : { buf: to, equals: (a: { buf: Buffer }) => to.equals(a.buf) },
      value: new BN(this.value.toBuffer()),
      data,
      AccessListJSON: this.accessListJSON,
      getSenderAddress: () => ({
        buf: sender,
        equals: (a: { buf: Buffer }) => sender.equals(a.buf),
        toString() {
          return from.toString();
        }
      }),
      /**
       * the minimum amount of gas the tx must have (DataFee + TxFee + Creation Fee)
       */
      getBaseFee: () => {
        const fee = this.calculateIntrinsicGas();
        return new BN(Quantity.toBuffer(fee + this.accessListDataFee));
      },
      getUpfrontCost: (baseFee: BN = new BN(0)) => {
        const { gas, maxPriorityFeePerGas, maxFeePerGas, value } = this;
        const maxPriorityFeePerGasBN = new BN(maxPriorityFeePerGas.toBuffer());
        const maxFeePerGasBN = new BN(maxFeePerGas.toBuffer());
        const gasLimitBN = new BN(gas.toBuffer());
        const valueBN = new BN(value.toBuffer());

        const inclusionFeePerGas = BN.min(
          maxPriorityFeePerGasBN,
          maxFeePerGasBN.sub(baseFee)
        );
        const gasPrice = inclusionFeePerGas.add(baseFee);

        return gasLimitBN.mul(gasPrice).add(valueBN);
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
    const raw: EIP1559FeeMarketDatabaseTx = this.toEthRawTransaction(
      BUFFER_ZERO,
      BUFFER_ZERO,
      BUFFER_ZERO
    );
    const data = encodeRange(raw, 1, 9);
    const dataLength = data.length;

    const msgHash = keccak(
      Buffer.concat([typeBuf, digest([data.output], dataLength)])
    );
    const sig = ecsign(msgHash, privateKey);
    this.v = Quantity.from(sig.v);
    this.r = Quantity.from(sig.r);
    this.s = Quantity.from(sig.s);

    raw[10] = this.v.toBuffer();
    raw[11] = this.r.toBuffer();
    raw[12] = this.s.toBuffer();

    this.raw = raw;

    const encodedSignature = encodeRange(raw, 10, 3);
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
  ): EIP1559FeeMarketDatabaseTx {
    return [
      this.type.toBuffer(),
      this.chainId.toBuffer(),
      this.nonce.toBuffer(),
      this.maxPriorityFeePerGas.toBuffer(),
      this.maxFeePerGas.toBuffer(),
      this.gas.toBuffer(),
      this.to.toBuffer(),
      this.value.toBuffer(),
      this.data.toBuffer(),
      this.accessList,
      v,
      r,
      s
    ];
  }

  public computeIntrinsics(v: Quantity, raw: TypedDatabaseTransaction) {
    return computeIntrinsicsFeeMarketTx(v, <EIP1559FeeMarketDatabaseTx>raw);
  }

  public updateEffectiveGasPrice(baseFeePerGas: Quantity) {
    const baseFeePerGasBigInt = baseFeePerGas.toBigInt();
    const maxFeePerGas = this.maxFeePerGas.toBigInt();
    const maxPriorityFeePerGas = this.maxPriorityFeePerGas.toBigInt();
    const a = maxFeePerGas - baseFeePerGasBigInt;
    const tip = a < maxPriorityFeePerGas ? a : maxPriorityFeePerGas;
    this.effectiveGasPrice = Quantity.from(baseFeePerGasBigInt + tip);
  }
}
