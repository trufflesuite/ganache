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
import { BN } from "ethereumjs-util";
import { ecsign } from "ethereumjs-util";
import { TypedRpcTransaction } from "./rpc-transaction";
import { encodeRange, digest } from "@ganache/rlp";
import { RuntimeTransaction } from "./runtime-transaction";
import {
  EIP2930AccessListDatabasePayload,
  EIP2930AccessListDatabaseTx,
  TypedDatabaseTransaction
} from "./raw";
import { AccessList, AccessListBuffer } from "@ethereumjs/tx";
import { AccessLists } from "./access-lists";
import { computeInstrinsicsAccessListTx } from "./signing";

const CAPABILITIES: any[] = [2718, 2930];
export class EIP2930AccessListTransaction extends RuntimeTransaction {
  public chainId: Quantity;
  public accessList: AccessListBuffer;
  public accessListJSON: AccessList;
  public gasPrice: Quantity;
  public type: Quantity = Quantity.from("0x1");

  public constructor(
    data: EIP2930AccessListDatabasePayload | TypedRpcTransaction,
    common: Common
  ) {
    super(data, common);
    if (Array.isArray(data)) {
      this.chainId = Quantity.from(data[0]);
      this.nonce = Quantity.from(data[1], true);
      this.gasPrice = Quantity.from(data[2]);
      this.gas = Quantity.from(data[3]);
      this.to = data[4].length == 0 ? RPCQUANTITY_EMPTY : Address.from(data[4]);
      this.value = Quantity.from(data[5]);
      this.data = Data.from(data[6]);
      const accessListData = AccessLists.getAccessListData(data[7]);
      this.accessList = accessListData.accessList;
      this.accessListJSON = accessListData.AccessListJSON;
      this.v = Quantity.from(data[8]);
      this.r = Quantity.from(data[9]);
      this.s = Quantity.from(data[10]);
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
      this.gasPrice = Quantity.from(data.gasPrice);
      const accessListData = AccessLists.getAccessListData(data.accessList);
      this.accessList = accessListData.accessList;
      this.accessListJSON = accessListData.AccessListJSON;
    }
  }

  public toJSON = () => {
    return {
      hash: this.hash,
      nonce: this.nonce,
      blockHash: null,
      blockNumber: null,
      transactionIndex: null,
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
  };

  public static fromTxData(
    data: EIP2930AccessListDatabasePayload | TypedRpcTransaction,
    common: Common
  ) {
    return new EIP2930AccessListTransaction(data, common);
  }

  public toVmTransaction() {
    const sender = this.from.toBuffer();
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
      getUpfrontCost: () => {
        const { gas, gasPrice, value } = this;
        try {
          const c = gas.toBigInt() * gasPrice.toBigInt() + value.toBigInt();
          return new BN(Quantity.from(c).toBuffer());
        } catch (e) {
          throw e;
        }
      },
      supports: (capability: any) => {
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
    const raw: EIP2930AccessListDatabaseTx = this.toEthRawTransaction(
      Quantity.from(chainId).toBuffer(),
      BUFFER_EMPTY,
      BUFFER_EMPTY
    );
    const data = encodeRange(raw, 1, 8);
    const dataLength = data.length;

    const ending = encodeRange(raw, 9, 3);
    const msg = Buffer.concat([
      typeBuf,
      digest([data.output, ending.output], dataLength + ending.length)
    ]);
    const msgHash = keccak(msg);
    const sig = ecsign(msgHash, privateKey, chainId);
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
    return computeInstrinsicsAccessListTx(
      v,
      <EIP2930AccessListDatabaseTx>raw,
      chainId
    );
  }
}
