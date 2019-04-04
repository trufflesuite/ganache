import { JsonRpcData, JsonRpcQuantity } from "./json-rpc";
import Address from "./address";

export default class Account {
  public address: Address;
  public balance: JsonRpcQuantity = new JsonRpcQuantity(0n);
  public privateKey: JsonRpcData;
  constructor(address: Address) {
    this.address = address;
  }
}
