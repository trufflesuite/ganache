import {Data, Quantity} from "@ganache/core/src/things/json-rpc";
import Address from "./address";
import {rlp, KECCAK256_RLP, KECCAK256_NULL} from "ethereumjs-util";

export default class Account {
  public address: Address;
  public balance: Quantity;
  public privateKey: Data;
  public nonce: Quantity;
  public stateRoot: Buffer = KECCAK256_RLP;
  public codeHash: Buffer = KECCAK256_NULL;

  constructor(address: Address);
  constructor(buffer: Buffer);
  constructor(arg: Address | Buffer) {
    if (arg instanceof Address) {
      this.address = arg;
      this.balance = new Quantity(0n);
      this.nonce = new Quantity(0n);
    } else if (Buffer.isBuffer(arg)) {
      const arr = (rlp.decode(arg) as any) as Buffer[];
      this.nonce = Quantity.from(arr[0]);
      this.balance = Quantity.from(arr[1]);
      this.stateRoot = arr[2];
      this.codeHash = arr[3];
    }
  }
  public serialize() {
    return rlp.encode(Buffer.concat([this.nonce.toBuffer(), this.balance.toBuffer(), this.stateRoot, this.codeHash]));
  }
}
