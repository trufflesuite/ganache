import JSBI from "jsbi";

export default class HexQuantity {
  private data: JSBI;

  constructor(quantity: JSBI | Buffer | number | string) {
    if (quantity instanceof Buffer) {
      this.data = JSBI.BigInt(quantity.toString("hex"));
    } else if (quantity instanceof JSBI) {
        this.data = quantity;
    } else {
      switch (typeof quantity) {
        case "number":
        case "string":
          this.data = JSBI.BigInt(quantity);
          break;
        default:
          throw new TypeError("quantity is not a Buffer, number, or string");
      }
    }
  }
  toBigNum(): JSBI {
    return this.data;
  }
  toString(): string {
    return `$0x${this.data.toString(16)}`;
  }
}
