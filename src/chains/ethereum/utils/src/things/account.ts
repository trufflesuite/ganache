import { Address } from "@ganache/ethereum-address";
import { Data, Quantity } from "@ganache/utils";
import { KECCAK256_RLP, KECCAK256_NULL } from "@ethereumjs/util";
import { encode, decode } from "@ganache/rlp";

export type EthereumRawAccount = [
  nonce: Buffer,
  balance: Buffer,
  stateRoot: Buffer,
  codeHash: Buffer
];

export class Account {
  public address: Address;
  public balance: Quantity;
  public privateKey: Data;
  public nonce: Quantity;
  public storageRoot: Buffer = KECCAK256_RLP;
  public codeHash: Buffer = KECCAK256_NULL;

  constructor(address: Address) {
    this.address = address;
    this.balance = Quantity.Empty;
    this.nonce = Quantity.Empty;
  }

  public static fromBuffer(buffer: Buffer) {
    const account = Object.create(Account.prototype);
    const raw = decode<EthereumRawAccount>(buffer);
    account.nonce = Quantity.from(raw[0]);
    account.balance = Quantity.from(raw[1]);
    account.storageRoot = raw[2];
    account.codeHash = raw[3];
    return account;
  }

  public serialize() {
    return encode([
      this.nonce.toBuffer(),
      this.balance.toBuffer(),
      this.storageRoot,
      this.codeHash
    ]);
  }
}
