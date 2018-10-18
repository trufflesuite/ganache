import HexData from "./hex-data";
import HexQuantity from "./hex-quantity";

export default class Account {
  public address: HexData
  public balance: HexQuantity = new HexQuantity("0x0")
  public secretKey: HexData
  constructor(address: HexData) {
    this.address = address;
  }
}
