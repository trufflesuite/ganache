import { Data, Quantity } from "@ganache/utils";
import { Address } from "./address";
import { rlp, KECCAK256_RLP, KECCAK256_NULL } from "ethereumjs-util";
import { utils } from "@ganache/utils";

const RPCQUANTITY_ZERO = utils.RPCQUANTITY_ZERO;

export class Account {
  public address: Address;
  public balance: Quantity;
  public privateKey: Data;
  public nonce: Quantity;
  public stateRoot: Buffer = KECCAK256_RLP;
  public codeHash: Buffer = KECCAK256_NULL;

  constructor(address: Address) {
    this.address = address;
    this.balance = RPCQUANTITY_ZERO;
    this.nonce = RPCQUANTITY_ZERO;
  }

  public static fromBuffer(buffer: Buffer) {
    const account = Object.create(Account.prototype);
    const arr = (rlp.decode(buffer) as any) as [Buffer, Buffer, Buffer, Buffer];
    account.nonce = Quantity.from(arr[0]);
    account.balance = Quantity.from(arr[1]);
    account.stateRoot = arr[2];
    account.codeHash = arr[3];
    return account;
  }

  public serialize() {
    return rlp.encode([
      this.nonce.toBuffer(),
      this.balance.toBuffer(),
      this.stateRoot,
      this.codeHash
    ]);
  }
}
