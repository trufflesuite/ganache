import { utils, Data, Quantity } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import type Common from "@ethereumjs/common";
import { ecsign } from "ethereumjs-util";
import { BaseTransaction } from "./base-transaction";
import { encodeRange, digest } from "@ganache/rlp";
import { BN } from "ethereumjs-util";
import { Hardfork } from "./hardfork";
import { Params } from "./params";
import { RuntimeTransaction } from "./runtime-transaction";
import { TypedRpcTransaction } from "./rpc-transaction";
import { RawLegacyTx, TypedRawTransaction } from "./raw";
import { computeInstrinsicsLegacyTx } from "./signing";

const { keccak, BUFFER_EMPTY, BUFFER_32_ZERO, RPCQUANTITY_EMPTY } = utils;

const MAX_UINT64 = 1n << (64n - 1n);

export interface LegacyTransactionJSON {
  type?: Quantity;
  hash: Data;
  nonce: Quantity;
  blockHash: Data;
  blockNumber: Quantity;
  transactionIndex: Data;
  from: Data | null;
  to: Address | null;
  value: Quantity;
  gas: Quantity;
  gasPrice: Quantity;
  input: Data;
  v: Quantity;
  r: Quantity;
  s: Quantity;
}
export class LegacyTransaction extends RuntimeTransaction {
  public gasPrice: Quantity;
  public type: Quantity;

  public constructor(data: RawLegacyTx | TypedRpcTransaction, common: Common) {
    super(data, common);
    // handle raw data (sendRawTranasction)
    if (Array.isArray(data)) {
      if (data.length > 9) {
        // we already know this is a legacy transaction, but
        // it could have the "type" field at the beginning.
        // so if there are more than nine fields, the user added
        // the transaction type to the beginning. We can remove it
        // and shift everything up in the array.
        this.type = Quantity.from("0x0");
        data.shift();
      }
      this.nonce = Quantity.from(data[0], true);
      this.gasPrice = Quantity.from(data[1]);
      this.gas = Quantity.from(data[2]);
      this.to = data[3].length == 0 ? RPCQUANTITY_EMPTY : Address.from(data[3]);
      this.value = Quantity.from(data[4]);
      this.data = Data.from(data[5]);
      this.v = Quantity.from(data[6]);
      this.r = Quantity.from(data[7]);
      this.s = Quantity.from(data[8]);

      const {
        from,
        serialized,
        hash,
        encodedData,
        encodedSignature
      } = this.computeIntrinsics(this.v, data, this.common.chainId());

      this.from = from;
      this.raw = data;
      this.serialized = serialized;
      this.hash = hash;
      this.encodedData = encodedData;
      this.encodedSignature = encodedSignature;
    } else {
      this.gasPrice = Quantity.from(data.gasPrice);
      if (data.type) {
        this.type = Quantity.from(data.type);
      }
    }
  }

  public toJSON = () => {
    let json: LegacyTransactionJSON = {
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
    if (this.type) {
      json.type = this.type;
    }
    return json;
  };

  public static fromTxData(
    data: RawLegacyTx | TypedRpcTransaction,
    common: Common
  ) {
    return new LegacyTransaction(data, common);
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
      getSenderAddress: () => ({
        buf: sender,
        equals: (a: { buf: Buffer }) => sender.equals(a.buf)
      }),
      /**
       * the minimum amount of gas the tx must have (DataFee + TxFee + Creation Fee)
       */
      getBaseFee: () => {
        let fee = this.calculateIntrinsicGas();
        if (to.equals(BUFFER_EMPTY)) {
          fee += Params.TRANSACTION_CREATION;
        }
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
        const capabilities: any[] = [];
        return capabilities.includes(capability);
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
    const raw: RawLegacyTx = this.toEthRawTransaction(
      Quantity.from(chainId).toBuffer(),
      BUFFER_EMPTY,
      BUFFER_EMPTY
    );
    if (this.type) {
      raw.shift();
    }
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
    const digested = digest(
      [data.output, encodedSignature.output],
      dataLength + encodedSignature.length
    );
    this.serialized = this.type
      ? Buffer.concat([this.type.toBuffer(), digested])
      : digested;
    this.hash = Data.from(keccak(this.serialized));
    this.encodedData = data;
    this.encodedSignature = encodedSignature;
  }

  public toEthRawTransaction(v?: Buffer, r?: Buffer, s?: Buffer): RawLegacyTx {
    if (this.type) {
      return [
        this.type.toBuffer(),
        this.nonce.toBuffer(),
        this.gasPrice.toBuffer(),
        this.gas.toBuffer(),
        this.to.toBuffer(),
        this.value.toBuffer(),
        this.data.toBuffer(),
        v ? v : this.v.toBuffer(),
        r ? r : this.r.toBuffer(),
        s ? s : this.s.toBuffer()
      ];
    } else {
      return [
        this.nonce.toBuffer(),
        this.gasPrice.toBuffer(),
        this.gas.toBuffer(),
        this.to.toBuffer(),
        this.value.toBuffer(),
        this.data.toBuffer(),
        v ? v : this.v.toBuffer(),
        r ? r : this.r.toBuffer(),
        s ? s : this.s.toBuffer()
      ];
    }
  }

  public computeIntrinsics(
    v: Quantity,
    raw: TypedRawTransaction,
    chainId: number
  ) {
    let shiftedRaw: RawLegacyTx = <RawLegacyTx>raw;
    if (raw.length !== 9) {
      shiftedRaw.shift();
    }
    return computeInstrinsicsLegacyTx(v, shiftedRaw, chainId);
  }
}
