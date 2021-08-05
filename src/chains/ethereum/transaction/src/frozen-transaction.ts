import { Data, Quantity, utils } from "@ganache/utils";
import { BN } from "ethereumjs-util";
import type Common from "@ethereumjs/common";
import {
  GanacheRawExtraTx,
  RawAccessListTx,
  RawLegacyTx,
  TypedRawTransaction
} from "./raw";
import { decode } from "@ganache/rlp";
import { BaseTransaction } from "./base-transaction";
import { Address } from "@ganache/ethereum-address";
import { Params } from "./params";
import { AccessListBuffer, AccessList } from "@ethereumjs/tx";
import { TransactionFactory } from "./transaction-factory";
import { LegacyTransaction } from "./legacy-transaction";
import { AccessListTransaction } from "./access-list-transaction";
import { AccessLists } from "./access-lists";

const { RPCQUANTITY_EMPTY, BUFFER_EMPTY, BUFFER_32_ZERO } = utils;

export interface FrozenTransactionJSON {
  type?: Quantity;
  hash: Data;
  chainId?: Quantity;
  nonce: Quantity;
  blockHash: Data;
  blockNumber: Quantity;
  transactionIndex: Quantity;
  from: Data | null;
  to: Address | null;
  value: Quantity;
  gas: Quantity;
  gasPrice: Quantity;
  input: Data;
  accessList?: AccessList;
  v: Quantity;
  r: Quantity;
  s: Quantity;
}

/**
 * A frozen tranasction is a transaction that is part of a block.
 */
export class FrozenTransaction extends BaseTransaction {
  public nonce: Quantity;
  public gasPrice: Quantity;
  public gas: Quantity;
  public to: Address | null;
  public value: Quantity;
  public data: Data;
  public v: Quantity;
  public r: Quantity;
  public s: Quantity;
  public type: Quantity;
  public chainId: Quantity;
  public accessList: AccessListBuffer;
  public accessListJSON: AccessList;

  // from, index, hash, blockNumber, and blockHash are extra data we store to
  // support account mascarading, quick receipts:
  // public from: Address;
  public index: Quantity;
  public hash: Data;
  public blockNumber: Quantity;
  public blockHash: Data;

  public common: Common;

  constructor(
    data: Buffer | [TypedRawTransaction, GanacheRawExtraTx],
    common: Common
  ) {
    super(common);

    if (Buffer.isBuffer(data)) {
      const decoded = (decode(data) as any) as [
        TypedRawTransaction,
        GanacheRawExtraTx
      ];

      this.setRaw(decoded[0]);
      this.setExtra(decoded[1]);
    } else {
      this.setRaw(data[0]);
      this.setExtra(data[1]);
    }
    Object.freeze(this);
  }

  public setRaw(raw: TypedRawTransaction) {
    const txType = TransactionFactory.typeOfRaw(raw);
    let [type, nonce, gasPrice, gasLimit, to, value, data, v, r, s]: Buffer[] = []; // prettier-ignore

    if (txType === LegacyTransaction) {
      [type, nonce, gasPrice, gasLimit, to, value, data, v, r, s] = <RawLegacyTx>raw; //prettier-ignore
    } else if (txType === AccessListTransaction) {
      let chainId: Buffer, accessList: AccessListBuffer;
      [type, chainId, nonce, gasPrice, gasLimit, to, value, data, accessList, v, r, s] = <RawAccessListTx>raw; //prettier-ignore

      this.type = Quantity.from(type);
      this.chainId = Quantity.from(chainId);
      const accessListData = AccessLists.getAccessListData(accessList);
      this.accessList = accessListData.accessList;
      this.accessListJSON = accessListData.AccessListJSON;
    }

    this.nonce = Quantity.from(nonce);
    this.gasPrice = Quantity.from(gasPrice);
    this.gas = Quantity.from(gasLimit);
    this.to = to.length === 0 ? RPCQUANTITY_EMPTY : Address.from(to);
    this.value = Quantity.from(value);
    this.data = Data.from(data);
    this.v = Quantity.from(v, true);
    this.r = Quantity.from(r, true);
    this.s = Quantity.from(s, true);
  }

  public setExtra(raw: GanacheRawExtraTx) {
    const [from, hash, blockHash, blockNumber, index] = raw;

    this.from = Address.from(from);
    this.hash = Data.from(hash, 32);
    this.blockHash = Data.from(blockHash, 32);
    this.blockNumber = Quantity.from(blockNumber);
    this.index = Quantity.from(index);
  }

  public toJSON = () => {
    let json: FrozenTransactionJSON = {
      hash: this.hash,
      nonce: this.nonce,
      blockHash: this.blockHash,
      blockNumber: this.blockNumber,
      transactionIndex: this.index,
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
    if (this.chainId) {
      json.chainId = this.chainId;
    }
    if (this.accessList) {
      json.accessList = this.accessListJSON;
    }
    return json;
  };

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
}
