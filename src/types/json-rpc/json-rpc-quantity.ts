import { BaseJsonRpcType, JsonRpcType, IndexableJsonRpcType } from ".";

class JsonRpcQuantity extends BaseJsonRpcType {
  public static from(value: bigint | string | Buffer) {
    return new _JsonRpcQuantity(value);
  }
  public toBigInt(): bigint {
    return BigInt(this.value);
  }
}
type $<T extends bigint|string|Buffer = bigint|string|Buffer> = {
  new(value: T): _JsonRpcQuantity & JsonRpcType<T>,
  from(value: T): _JsonRpcQuantity & JsonRpcType<T>,
  toBigInt(): bigint
}
const _JsonRpcQuantity = JsonRpcQuantity as $;

interface _JsonRpcQuantity<T = bigint | string | Buffer> {
  constructor(value: T): _JsonRpcQuantity
  from(): _JsonRpcQuantity,
  toBigInt(): bigint
}

export type IndexableJsonRpcQuantity = _JsonRpcQuantity & IndexableJsonRpcType;
export default _JsonRpcQuantity;
