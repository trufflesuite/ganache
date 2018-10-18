export default class HexData {
  private data: any;
  constructor(data: string) {
    if(data.indexOf("0x") !== -1) {
      throw new TypeError("Invalid hex data");
    }
    this.data = data
  }
  toString() {
    return this.data;
  }
}
