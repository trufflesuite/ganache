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
import { BN, ecsign } from "ethereumjs-util";
import { TypedRpcTransaction } from "./rpc-transaction";
import { encodeRange, digest } from "@ganache/rlp";
import { RuntimeTransaction } from "./runtime-transaction";
import {
  EIP1559FeeMarketDatabasePayload,
  EIP1559FeeMarketDatabaseTx,
  GanacheRawExtraTx,
  TypedDatabaseTransaction
} from "./raw";
import { AccessList, AccessListBuffer } from "@ethereumjs/tx";
import { AccessLists } from "./access-lists";
import { computeInstrinsicsFeeMarketTx } from "./signing";
import {
  Capability,
  EIP1559FeeMarketTransactionJSON
} from "./transaction-types";

const CAPABILITIES = [2718, 2930, 1559];
export class EIP1559FeeMarketTransaction extends RuntimeTransaction {
  public chainId: Quantity;
  public maxPriorityFeePerGas: Quantity;
  public maxFeePerGas: Quantity;
  public accessList: AccessListBuffer;
  public accessListJSON: AccessList;
  public type: Quantity = Quantity.from("0x2");

  public constructor(
    data: EIP1559FeeMarketDatabasePayload | TypedRpcTransaction,
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
      this.to = data[5].length == 0 ? RPCQUANTITY_EMPTY : Address.from(data[5]);
      this.value = Quantity.from(data[6]);
      this.data = Data.from(data[7]);
      const accessListData = AccessLists.getAccessListData(data[8]);
      this.accessList = accessListData.accessList;
      this.accessListJSON = accessListData.AccessListJSON;
      this.v = Quantity.from(data[9]);
      this.r = Quantity.from(data[10]);
      this.s = Quantity.from(data[11]);
      this.raw = [this.type.toBuffer(), ...data];

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
    } else {
      this.chainId = Quantity.from(data.chainId);
      this.maxPriorityFeePerGas = Quantity.from(data.maxPriorityFeePerGas);
      this.maxFeePerGas = Quantity.from(data.maxFeePerGas);
      const accessListData = AccessLists.getAccessListData(data.accessList);
      this.accessList = accessListData.accessList;
      this.accessListJSON = accessListData.AccessListJSON;
      this.validateAndSetSignature(data);
    }
  }

  public toJSON(): EIP1559FeeMarketTransactionJSON {
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
      effectiveGasPrice: this.effectiveGasPrice
        ? this.effectiveGasPrice
        : this.maxFeePerGas,
      gas: this.gas,
      input: this.data,
      accessList: this.accessListJSON,
      v: this.v,
      r: this.r,
      s: this.s
    };
  }

  public static fromTxData(
    data: EIP1559FeeMarketDatabasePayload | TypedRpcTransaction,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    return new EIP1559FeeMarketTransaction(data, common, extra);
  }

  public toVmTransaction() {
    const sender = this.from.toBuffer();
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
        equals: (a: { buf: Buffer }) => sender.equals(a.buf)
      }),
      /**
       * the minimum amount of gas the tx must have (DataFee + TxFee + Creation Fee)
       */
      getBaseFee: () => {
        const fee = this.calculateIntrinsicGas();
        return new BN(Quantity.from(fee).toBuffer());
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

    const chainId = this.common.chainId();
    const typeBuf = this.type.toBuffer();
    const raw: EIP1559FeeMarketDatabaseTx = this.toEthRawTransaction(
      Quantity.from(chainId).toBuffer(),
      BUFFER_EMPTY,
      BUFFER_EMPTY
    );
    const data = encodeRange(raw, 1, 9);
    const dataLength = data.length;

    const ending = encodeRange(raw, 10, 3);
    const msg = Buffer.concat([
      typeBuf,
      digest([data.output, ending.output], dataLength + ending.length)
    ]);
    const msgHash = keccak(msg);
    const sig = ecsign(msgHash, privateKey, chainId);
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

  public computeIntrinsics(
    v: Quantity,
    raw: TypedDatabaseTransaction,
    chainId: number
  ) {
    return computeInstrinsicsFeeMarketTx(
      v,
      <EIP1559FeeMarketDatabaseTx>raw,
      chainId
    );
  }

  public updateEffectiveGasPrice(baseFeePerGas?: Quantity) {
    if (baseFeePerGas) {
      const baseFeePerGasNum = baseFeePerGas.toNumber();
      const maxFeePerGasNum = this.maxFeePerGas.toNumber();
      const maxPriorityFeePerGasNum = this.maxPriorityFeePerGas.toNumber();
      const tip = Math.min(
        maxFeePerGasNum - baseFeePerGasNum,
        maxPriorityFeePerGasNum
      );
      this.effectiveGasPrice = Quantity.from(baseFeePerGasNum + tip);
    } else {
      // this can only happen if baseFeePerGas isn't set, which means
      // we're pre eip-1559, which means we shouldn't be here in the
      // first place. Might be safe to remove this case.
      this.effectiveGasPrice = this.maxFeePerGas;
    }
  }
}
