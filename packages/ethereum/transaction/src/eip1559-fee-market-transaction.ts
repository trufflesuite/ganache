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
import { EIP1559FeeMarketRpcTransaction } from "./rpc-transaction";
import { encodeRange } from "@ganache/rlp";
import { RuntimeTransaction } from "./runtime-transaction";
import { EIP1559FeeMarketRawTransaction, GanacheRawExtraTx } from "./raw";
import { AccessList, AccessListBuffer, AccessLists } from "./access-lists";
import { computeIntrinsicsFeeMarketTx, digestWithPrefix } from "./signing";
import {
  Capability,
  EIP1559FeeMarketTransactionJSON
} from "./transaction-types";
import { CodedError } from "@ganache/ethereum-utils";

const bigIntMin = (...args: bigint[]) => args.reduce((m, e) => (e < m ? e : m));

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
    data: EIP1559FeeMarketRawTransaction | EIP1559FeeMarketRpcTransaction,
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
      this.to = data[5].length == 0 ? null : Address.from(data[5]);
      this.value = Quantity.from(data[6]);
      this.data = Data.from(data[7]);
      const accessListData = AccessLists.getAccessListData(data[8]);
      this.accessList = accessListData.accessList;
      this.accessListJSON = accessListData.AccessListJSON;
      this.accessListDataFee = accessListData.dataFeeEIP2930;
      this.v = Quantity.from(data[9]);
      this.r = Quantity.from(data[10]);
      this.s = Quantity.from(data[11]);
      this.raw = data;

      if (!extra) {
        // TODO(hack): we use the presence of `extra` to determine if this data
        // come from the "database" or not. Transactions that come from the
        // database must not be validated since they may come from a fork.
        if (common.chainId() !== this.chainId.toBigInt()) {
          throw new CodedError(
            `Invalid chain id (${this.chainId.toNumber()}) for chain with id ${common.chainId()}.`,
            JsonRpcErrorCode.INVALID_INPUT
          );
        }

        const { from, serialized, hash } = this.computeIntrinsics(
          this.v,
          this.raw
        );

        this.from = from;
        this.serialized = serialized;
        this.hash = hash;
      }
    } else {
      if (data.chainId) {
        this.chainId = Quantity.from(data.chainId);
      } else {
        this.chainId = Quantity.from(common.chainId());
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
      to: this.to,
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
    data: EIP1559FeeMarketRawTransaction | EIP1559FeeMarketRpcTransaction,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    return new EIP1559FeeMarketTransaction(data, common, extra);
  }

  public toVmTransaction() {
    const data = this.data.toBuffer();
    return {
      hash: () => BUFFER_32_ZERO,
      nonce: this.nonce.toBigInt(),
      common: this.common,
      maxPriorityFeePerGas: this.maxPriorityFeePerGas.toBigInt(),
      maxFeePerGas: this.maxFeePerGas.toBigInt(),
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
        return this.calculateIntrinsicGas();
      },
      getUpfrontCost: (baseFee: bigint = 0n) => {
        const { gas, maxPriorityFeePerGas, maxFeePerGas, value } = this;
        const maxPriorityFeePerGasBI = maxPriorityFeePerGas.toBigInt();
        const maxFeePerGasBI = maxFeePerGas.toBigInt();
        const gasLimitBI = gas.toBigInt();
        const valueBI = value.toBigInt();

        const inclusionFeePerGas = bigIntMin(
          maxPriorityFeePerGasBI,
          maxFeePerGasBI - baseFee
        );
        const gasPrice = inclusionFeePerGas + baseFee;

        return gasLimitBI * gasPrice + valueBI;
      },
      supports: (capability: Capability) => {
        return CAPABILITIES.includes(capability);
      }
    };
  }
  public calculateIntrinsicGas(): bigint {
    return super.calculateIntrinsicGas() + this.accessListDataFee;
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

    const raw = this.toEthRawTransaction(BUFFER_ZERO, BUFFER_ZERO, BUFFER_ZERO);
    const data = encodeRange(raw, 0, 9);
    const dataLength = data.length;

    const msgHash = keccak(digestWithPrefix(2, [data.output], dataLength));
    const sig = ecsign(msgHash, privateKey);
    this.v = Quantity.from(sig.v);
    this.r = Quantity.from(sig.r);
    this.s = Quantity.from(sig.s);

    raw[9] = this.v.toBuffer();
    raw[10] = this.r.toBuffer();
    raw[11] = this.s.toBuffer();

    this.raw = raw;

    const encodedSignature = encodeRange(raw, 9, 3);
    const ranges = [data.output, encodedSignature.output];
    const length = dataLength + encodedSignature.length;
    // serialized is type concatenated with the rest of the data rlp encoded
    this.serialized = digestWithPrefix(2, ranges, length);
    this.hash = Data.from(keccak(this.serialized));
  }

  public toEthRawTransaction(
    v: Buffer,
    r: Buffer,
    s: Buffer
  ): EIP1559FeeMarketRawTransaction {
    return [
      this.chainId.toBuffer(),
      this.nonce.toBuffer(),
      this.maxPriorityFeePerGas.toBuffer(),
      this.maxFeePerGas.toBuffer(),
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

  public computeIntrinsics(v: Quantity, raw: EIP1559FeeMarketRawTransaction) {
    return computeIntrinsicsFeeMarketTx(v, raw);
  }

  public updateEffectiveGasPrice(baseFeePerGas: bigint) {
    const maxFeePerGas = this.maxFeePerGas.toBigInt();
    const maxPriorityFeePerGas = this.maxPriorityFeePerGas.toBigInt();
    const a = maxFeePerGas - baseFeePerGas;
    const tip = a < maxPriorityFeePerGas ? a : maxPriorityFeePerGas;

    this.effectiveGasPrice = Quantity.from(baseFeePerGas + tip);
  }
}
