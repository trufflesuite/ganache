import { utils, Data, Quantity } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import type Common from "@ethereumjs/common";
import { BaseTransaction } from "./base-transaction";
import { BN } from "ethereumjs-util";
import { Hardfork } from "./hardfork";
import { Params } from "./params";
import { TypedRpcTransaction } from "./rpc-transaction";
import { RuntimeTransaction } from "./runtime-transaction";
import {
  EthereumRawAccessListTx,
  EthereumRawTx,
  TypedRawTransaction
} from "./raw";
import {
  AccessListEIP2930Transaction,
  AccessList,
  AccessListBuffer
} from "@ethereumjs/tx";
import { AccessLists } from "./access-lists";
import { computeInstrinsicsAccessListTx } from "./signing";

const { BUFFER_EMPTY, BUFFER_32_ZERO } = utils;

const MAX_UINT64 = 1n << (64n - 1n);

export class AccessListTransaction extends RuntimeTransaction {
  public chainId: BN;
  public accessList: AccessListBuffer;
  public accessListJSON: AccessList;
  public gasPrice: Quantity;

  public constructor(
    data: EthereumRawAccessListTx | TypedRpcTransaction,
    common: Common
  ) {
    super(data, common);
    if (Array.isArray(data)) {
      this.gasPrice = Quantity.from(data[2]);
    } else {
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

  public static fromTxData(data: TypedRpcTransaction, common: Common) {
    return new AccessListTransaction(data, common);
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
    computeInstrinsicsAccessListTx(v, <EthereumRawAccessListTx>raw, chainId);
  }
}
