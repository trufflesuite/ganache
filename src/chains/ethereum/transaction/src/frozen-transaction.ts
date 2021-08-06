import { Data, Quantity, RPCQUANTITY_EMPTY } from "@ganache/utils";
import type Common from "@ethereumjs/common";
import { EthereumRawTx, GanacheRawExtraTx } from "./raw";
import { decode } from "@ganache/rlp";
import { BaseTransaction } from "./base-transaction";
import { Address } from "@ganache/ethereum-address";

/**
 * A frozen transaction is a transaction that is part of a block.
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

  // from, index, hash, blockNumber, and blockHash are extra data we store to
  // support account masquerading, quick receipts:
  // public from: Address;
  public index: Quantity;
  public hash: Data;
  public blockNumber: Quantity;
  public blockHash: Data;

  public common: Common;

  constructor(
    data: Buffer | [EthereumRawTx, GanacheRawExtraTx],
    common: Common
  ) {
    super(common);

    if (Buffer.isBuffer(data)) {
      const decoded = (decode(data) as any) as [
        EthereumRawTx,
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

  public setRaw(raw: EthereumRawTx) {
    const [nonce, gasPrice, gasLimit, to, value, data, v, r, s] = raw;

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
    return {
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
  };
}
