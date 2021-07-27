import { utils, Data, Quantity } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import type Common from "@ethereumjs/common";
import { BaseTransaction } from "./base-transaction";
import { BN } from "ethereumjs-util";
import { Hardfork } from "./hardfork";
import { Params } from "./params";
import { RuntimeTransaction } from "./runtime-transaction";
import { TypedRpcTransaction } from "./rpc-transaction";
import { EthereumRawTx, TypedRawTransaction } from "./raw";
import { computeInstrinsicsLegacyTx } from "./signing";

const { BUFFER_EMPTY, BUFFER_32_ZERO } = utils;

const MAX_UINT64 = 1n << (64n - 1n);

export class LegacyTransaction extends RuntimeTransaction {
  public gasPrice: Quantity;

  public constructor(
    data: TypedRawTransaction | TypedRpcTransaction,
    common: Common
  ) {
    super(data, common); // TODO: concerns that this.gasPrice won't be set yet as RuntimeTransaction starts referencing it.
    if (Array.isArray(data)) {
      this.gasPrice = Quantity.from(data[1]);
    } else {
      this.gasPrice = Quantity.from(data.gasPrice);
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
    data: TypedRawTransaction | TypedRpcTransaction,
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

  public toEthRawTransaction(
    v?: Buffer,
    r?: Buffer,
    s?: Buffer
  ): EthereumRawTx {
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

  public computeIntrinsics(
    v: Quantity,
    raw: TypedRawTransaction,
    chainId: number
  ) {
    computeInstrinsicsLegacyTx(v, <EthereumRawTx>raw, chainId);
  }
}
