import {IndexableJsonRpcType, JsonRpcData} from "./json-rpc";

const Address = JsonRpcData;

interface Address extends JsonRpcData {}
export type IndexableAddress = Address & IndexableJsonRpcType;
export default Address;