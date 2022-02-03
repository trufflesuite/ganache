import {
  Data,
  Quantity,
  keccak,
  BUFFER_EMPTY,
  BUFFER_32_ZERO,
  RPCQUANTITY_EMPTY
} from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import type Common from "@ethereumjs/common";
import { ecsign } from "ethereumjs-util";
import { encodeRange, digest } from "@ganache/rlp";
import { BN } from "ethereumjs-util";
import { RuntimeTransaction } from "./runtime-transaction";
import { Transaction } from "./rpc-transaction";
import {
  EIP2930AccessListDatabasePayload,
  GanacheRawExtraTx,
  LegacyDatabasePayload,
  TypedDatabaseTransaction
} from "./raw";
import { computeIntrinsicsLegacyTx } from "./signing";
import { Capability, LegacyTransactionJSON } from "./transaction-types";

export class LegacyTransaction extends RuntimeTransaction {
  public gasPrice: Quantity;
  public type: Quantity = Quantity.from("0x0");

  public constructor(
    data: LegacyDatabasePayload | Transaction,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    super(data, common, extra);
    if (Array.isArray(data)) {
      this.nonce = Quantity.from(data[0]);
      this.gasPrice = this.effectiveGasPrice = Quantity.from(data[1]);
      this.gas = Quantity.from(data[2]);
      this.to = data[3].length == 0 ? RPCQUANTITY_EMPTY : Address.from(data[3]);
      this.value = Quantity.from(data[4]);
      this.data = Data.from(data[5]);
      this.v = Quantity.from(data[6]);
      this.r = Quantity.from(data[7]);
      this.s = Quantity.from(data[8]);
      this.raw = data;

      if (!extra) {
        // TODO(hack): Transactions that come from the database must not be
        // validated since they may come from a fork.
        const {
          from,
          serialized,
          hash,
          encodedData,
          encodedSignature
        } = this.computeIntrinsics(this.v, this.raw, this.common.chainId());

        this.from = from;
        this.serialized = serialized;
        this.hash = hash;
        this.encodedData = encodedData;
        this.encodedSignature = encodedSignature;
      }
    } else {
      this.gasPrice = this.effectiveGasPrice = Quantity.from(data.gasPrice);

      this.validateAndSetSignature(data);
    }
  }

  public maxGasPrice() {
    return this.gasPrice;
  }

  public toJSON(common?: Common): LegacyTransactionJSON {
    const json: LegacyTransactionJSON = {
      hash: this.hash,
      type: this.type,
      nonce: this.nonce,
      blockHash: this.blockHash ? this.blockHash : null,
      blockNumber: this.blockNumber ? this.blockNumber : null,
      transactionIndex: this.index ? this.index : null,
      from: this.from,
      to: this.to.isNull() ? null : this.to,
      value: this.value,
      gas: this.gas,
      gasPrice: this.gasPrice,
      input: this.data,
      v: this.v,
      r: this.r,
      s: this.s
    };

    if ((this.common || common).isActivatedEIP(2718)) {
      json.type = this.type;
    }
    return json;
  }

  public static fromTxData(
    data: LegacyDatabasePayload | Transaction,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    return new LegacyTransaction(data, common, extra);
  }

  public static fromEIP2930AccessListTransaction(
    data: EIP2930AccessListDatabasePayload | Transaction,
    common: Common
  ) {
    if (Array.isArray(data)) {
      // remove 1st item, chainId, and 7th item, accessList
      return new LegacyTransaction(
        data.slice(1, 7).concat(data.slice(8)) as LegacyDatabasePayload,
        common
      );
    }
    return new LegacyTransaction(data, common);
  }
  public toVmTransaction() {
    const from = this.from;
    const sender = from.toBuffer();
    const to = this.to.toBuffer();
    const data = this.data.toBuffer();
    return {
      hash: () => BUFFER_32_ZERO,
      nonce: new BN(this.nonce.toBuffer()),
      gasPrice: new BN(this.gasPrice.toBuffer()),
      gasLimit: new BN(this.gas.toBuffer()),
      to:
        to.length === 0
          ? null
          : { buf: to, equals: (a: { buf: Buffer }) => to.equals(a.buf) },
      value: new BN(this.value.toBuffer()),
      data,
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
        return new BN(Quantity.from(fee).toBuffer());
      },
      getUpfrontCost: () => {
        const { gas, gasPrice, value } = this;
        const c = gas.toBigInt() * gasPrice.toBigInt() + value.toBigInt();
        return new BN(Quantity.from(c).toBuffer());
      },
      supports: (capability: Capability) => {
        return false;
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

    const chainId = this.common.chainId();
    const raw: LegacyDatabasePayload = this.toEthRawTransaction(
      Quantity.from(chainId).toBuffer(),
      BUFFER_EMPTY,
      BUFFER_EMPTY
    );
    const data = encodeRange(raw, 0, 6);
    const dataLength = data.length;

    const ending = encodeRange(raw, 6, 3);
    const msgHash = keccak(
      digest([data.output, ending.output], dataLength + ending.length)
    );
    const sig = ecsign(msgHash, privateKey, chainId);
    this.v = Quantity.from(sig.v);
    this.r = Quantity.from(sig.r);
    this.s = Quantity.from(sig.s);

    raw[6] = this.v.toBuffer();
    raw[7] = this.r.toBuffer();
    raw[8] = this.s.toBuffer();

    this.raw = raw;
    const encodedSignature = encodeRange(raw, 6, 3);
    this.serialized = digest(
      [data.output, encodedSignature.output],
      dataLength + encodedSignature.length
    );
    this.hash = Data.from(keccak(this.serialized));
    this.encodedData = data;
    this.encodedSignature = encodedSignature;
  }

  public toEthRawTransaction(
    v: Buffer,
    r: Buffer,
    s: Buffer
  ): LegacyDatabasePayload {
    return [
      this.nonce.toBuffer(),
      this.gasPrice.toBuffer(),
      this.gas.toBuffer(),
      this.to.toBuffer(),
      this.value.toBuffer(),
      this.data.toBuffer(),
      v,
      r,
      s
    ];
  }

  public computeIntrinsics(
    v: Quantity,
    raw: TypedDatabaseTransaction,
    chainId: number
  ) {
    return computeIntrinsicsLegacyTx(v, <LegacyDatabasePayload>raw, chainId);
  }
  public updateEffectiveGasPrice() { }
}
