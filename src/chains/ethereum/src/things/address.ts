import {IndexableJsonRpcType, Data} from "@ganache/utils/src/things/json-rpc";

const Address = Data;

interface Address extends Data {}
export type IndexableAddress = Address & IndexableJsonRpcType;
export default Address;
