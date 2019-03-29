import { BaseHexData, HexData, IndexableHexData } from ".";


class BaseJsonRpcQuantity extends BaseHexData {





  public toString(): string {
    const str = this._str;
    if (str !== undefined) {
      return str;
    } else {
      return this._str = "0x" + this._toString();
    }
  }














  


  public static from(value: bigint | string | Buffer) {
    return new JsonRpcQuantity(value);
  }
}
type $<T extends bigint|string|Buffer = bigint|string|Buffer> = {
  new(value: T): JsonRpcQuantity & HexData<T>,
  from(value: T): JsonRpcQuantity & HexData<T>
}
const JsonRpcQuantity = BaseJsonRpcQuantity as $;

interface JsonRpcQuantity<T = bigint | string | Buffer> {
  constructor(value: T): JsonRpcQuantity
  from(): JsonRpcQuantity
}

export type IndexableJsonRpcQuantity = JsonRpcQuantity & IndexableHexData;
export default JsonRpcQuantity;
