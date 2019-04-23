import { BaseJsonRpcType, JsonRpcType, IndexableJsonRpcType } from ".";

class JsonRpcQuantity extends BaseJsonRpcType {
  public static from(value: number | bigint | string | Buffer) {
    return new _JsonRpcQuantity(value);
  }
  public toBigInt(): bigint {
    return BigInt(this.value);
  }
}
type $<T extends number|bigint|string|Buffer = number|bigint|string|Buffer> = {
  new(value: T): _JsonRpcQuantity & JsonRpcType<T>,
  from(value: T): _JsonRpcQuantity & JsonRpcType<T>,
  toBigInt(): bigint,
  toBuffer(): Buffer
}
const _JsonRpcQuantity = JsonRpcQuantity as $;

interface _JsonRpcQuantity<T = number | bigint | string | Buffer> {
  constructor(value: T): _JsonRpcQuantity
  from(): _JsonRpcQuantity,
  toBigInt(): bigint,
  toBuffer(): Buffer
}

export type IndexableJsonRpcQuantity = _JsonRpcQuantity & IndexableJsonRpcType;
export default _JsonRpcQuantity;
