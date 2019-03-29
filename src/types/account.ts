import { JsonRpcData, JsonRpcQuantity } from "./hex-data";

export default class Account {
  public address: JsonRpcData
  public balance: JsonRpcQuantity = new JsonRpcQuantity("0x0")
  public secretKey: JsonRpcData
  constructor(address: JsonRpcData) {
    this.address = address;
  }
}
