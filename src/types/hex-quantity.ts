export default class HexQuantity {
  private data: any;

  constructor(quantity: Buffer | number | string) {

    if (quantity instanceof Buffer) {
      // TODO: totally wrong
      this.data = quantity;
    } else {
      switch (typeof quantity) {
        case "number":
          this.data = quantity;
          break;
        case "string":
          if (quantity.indexOf("0x") !== -1) {
            throw new TypeError("Invalid hex data");
          } else {
            // TODO: handle big numbers
            const num = Number(quantity);
            if (isNaN(num)) {
              throw new Error("quantity string is not a number.")
            } else {
              this.data = num;
            }
          }
          break;
        default:
          throw new TypeError("quantity is not a Buffer, number, or string");
      }
    }
  }
  toString() {
    return this.data;
  }
}
