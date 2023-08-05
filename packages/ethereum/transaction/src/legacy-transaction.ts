import {
  Data,
  Quantity,
  keccak,
  BUFFER_EMPTY,
  BUFFER_32_ZERO,
  ecsignLegacy,
  ECSignResult
} from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import type { Common } from "@ethereumjs/common";
import { encodeRange, digest, EncodedPart } from "@ganache/rlp";
import { RuntimeTransaction } from "./runtime-transaction";
import { Transaction } from "./rpc-transaction";
import {
  EIP2930AccessListRawTransaction,
  GanacheRawExtraTx,
  LegacyRawTransaction
} from "./raw";
import { computeIntrinsicsLegacyTx } from "./signing";
import { Capability, LegacyTransactionJSON } from "./transaction-types";

export class LegacyTransaction extends RuntimeTransaction {
  public gasPrice: Quantity;
  public type: Quantity = Quantity.from("0x0");

  public constructor(
    data: LegacyRawTransaction | Transaction,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    super(data, common, extra);
    if (Array.isArray(data)) {
      this.nonce = Quantity.from(data[0]);
      this.gasPrice = this.effectiveGasPrice = Quantity.from(data[1]);
      this.gas = Quantity.from(data[2]);
      this.to = data[3].length == 0 ? null : Address.from(data[3]);
      this.value = Quantity.from(data[4]);
      this.data = Data.from(data[5]);
      this.v = Quantity.from(data[6]);
      this.r = Quantity.from(data[7]);
      this.s = Quantity.from(data[8]);
      this.raw = data;

      if (!extra) {
        // TODO(hack): Transactions that come from the database must not be
        // validated since they may come from a fork.
        const { from, serialized, hash } = this.computeIntrinsics(
          this.v,
          this.raw,
          this.common.chainId()
        );

        this.from = from;
        this.serialized = serialized;
        this.hash = hash;
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
      to: this.to,
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
    data: LegacyRawTransaction | Transaction,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    return new LegacyTransaction(data, common, extra);
  }

  public static fromEIP2930AccessListTransaction(
    data: EIP2930AccessListRawTransaction | Transaction,
    common: Common
  ) {
    if (Array.isArray(data)) {
      // remove 1st item, chainId, and 7th item, accessList
      return new LegacyTransaction(
        data.slice(1, 7).concat(data.slice(8)) as LegacyRawTransaction,
        common
      );
    }
    return new LegacyTransaction(data, common);
  }
  public toVmTransaction() {
    const data = this.data.toBuffer();
    return {
      hash: () => BUFFER_32_ZERO,
      common: this.common,
      nonce: this.nonce.toBigInt(),
      gasPrice: this.gasPrice.toBigInt(),
      gasLimit: this.gas.toBigInt(),
      to: this.to,
      value: this.value.toBigInt(),
      data,
      getSenderAddress: () => this.from,
      /**
       * the minimum amount of gas the tx must have (DataFee + TxFee + Creation Fee)
       */
      getBaseFee: () => {
        return this.calculateIntrinsicGas();
      },
      getUpfrontCost: () => {
        const { gas, gasPrice, value } = this;
        return gas.toBigInt() * gasPrice.toBigInt() + value.toBigInt();
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

    // only legacy transactions can work with EIP-155 deactivated.
    // (EIP-2930 and EIP-1559 made EIP-155 obsolete and this logic isn't needed
    // for those transactions)
    const eip155IsActive = this.common.gteHardfork("spuriousDragon");
    let chainId: Buffer;
    let raw: LegacyRawTransaction;
    let data: EncodedPart;
    let dataLength: number;
    let sig: ECSignResult;
    if (eip155IsActive) {
      chainId = Quantity.toBuffer(this.common.chainId());
      raw = this.toEthRawTransaction(chainId, BUFFER_EMPTY, BUFFER_EMPTY);
      data = encodeRange(raw, 0, 6);
      dataLength = data.length;

      const ending = encodeRange(raw, 6, 3);
      const msgHash = keccak(
        digest([data.output, ending.output], dataLength + ending.length)
      );
      sig = ecsignLegacy(msgHash, privateKey, this.common.chainId());
    } else {
      raw = this.toEthRawTransaction(BUFFER_EMPTY, BUFFER_EMPTY, BUFFER_EMPTY);
      data = encodeRange(raw, 0, 6);
      dataLength = data.length;
      const msgHash = keccak(digest([data.output], dataLength));
      sig = ecsignLegacy(msgHash, privateKey);
    }
    this.v = Quantity.from(sig.v);
    this.r = Quantity.from(sig.r);
    this.s = Quantity.from(sig.s);

    raw[6] = this.v.toBuffer();
    raw[7] = this.r.toBuffer();
    raw[8] = this.s.toBuffer();

    this.raw = raw;
    const encodedSignature = encodeRange(raw, 6, 3);
    const ranges = [data.output, encodedSignature.output];
    const length = dataLength + encodedSignature.length;
    // serialized is the rlp encoded raw data
    this.serialized = digest(ranges, length);
    this.hash = Data.from(keccak(this.serialized));
  }

  public toEthRawTransaction(
    v: Buffer,
    r: Buffer,
    s: Buffer
  ): LegacyRawTransaction {
    return [
      this.nonce.toBuffer(),
      this.gasPrice.toBuffer(),
      this.gas.toBuffer(),
      this.to ? this.to.toBuffer() : BUFFER_EMPTY,
      this.value.toBuffer(),
      this.data.toBuffer(),
      v,
      r,
      s
    ];
  }

  public computeIntrinsics(
    v: Quantity,
    raw: LegacyRawTransaction,
    chainId: bigint
  ) {
    return computeIntrinsicsLegacyTx(v, <LegacyRawTransaction>raw, chainId);
  }
  public updateEffectiveGasPrice() {}
}
