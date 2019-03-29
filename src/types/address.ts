import {IndexableHexData, HexData} from "./json-rpc";
import {BaseJsonRpcData} from "./json-rpc/json-rpc-data";

export class BaseAddress<T extends string|Buffer> extends BaseJsonRpcData<T> {
    constructor(value: T) {
        // the super will check the rest of the types
        if (typeof value === "bigint"){
            throw new Error(`Cannot create a ${typeof value} as a HexData`);
        }
        super(value);
    }
    public static from(value: string | Buffer) {
      return new Address(value);
    }
  }
  type $<T extends string|Buffer = string|Buffer> = {
    new(data: T): Address & HexData<T>,
    from(data: T): Address & HexData<T>
  }
  const Address = BaseAddress as $;
  
  interface Address<T = string | Buffer> {
    constructor(data: T): Address<T>
    from(): Address
  }
  
  export type IndexableAddress = Address & IndexableHexData;
  export default Address;
  