import { BaseJsonRpcType, JsonRpcType, IndexableJsonRpcType } from ".";

class JsonRpcQuantity extends BaseJsonRpcType {
  public static from(value: bigint | string | Buffer) {
    return new _JsonRpcQuantity(value);
  }
}
type $<T extends bigint|string|Buffer = bigint|string|Buffer> = {
  new(value: T): _JsonRpcQuantity & JsonRpcType<T>,
  from(value: T): _JsonRpcQuantity & JsonRpcType<T>
}
const _JsonRpcQuantity = JsonRpcQuantity as $;

interface _JsonRpcQuantity<T = bigint | string | Buffer> {
  constructor(value: T): _JsonRpcQuantity
  from(): _JsonRpcQuantity
}

export type IndexableJsonRpcQuantity = _JsonRpcQuantity & IndexableJsonRpcType;
export default _JsonRpcQuantity;
