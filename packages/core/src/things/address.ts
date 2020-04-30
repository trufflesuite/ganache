import {IndexableJsonRpcType, Data} from "./json-rpc";

const Address = Data;

interface Address extends Data {}
export type IndexableAddress = Address & IndexableJsonRpcType;
export default Address;
