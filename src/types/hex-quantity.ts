export default class HexQuantity {
  private data: bigint;

  constructor(quantity: bigint | Buffer | number | string) {
    if (quantity instanceof Buffer) {
      const str = quantity.toString("hex") as string;
      this.data = BigInt(str);
    } else {
      switch (typeof quantity) {
        case "bigint":
          this.data = quantity as bigint;
        case "number":
        case "string":
          this.data = BigInt(quantity);
          break;
        default:
          throw new TypeError("quantity is not a Buffer, number, or string");
      }
    }
  }
  toBigNum(): bigint {
    return this.data;
  }
  toString(): string {
    return `$0x${this.data.toString(16)}`;
  }
}
