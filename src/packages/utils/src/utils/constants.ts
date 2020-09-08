import { Quantity } from "../things/json-rpc/json-rpc-quantity";

export const ACCOUNT_ZERO = Buffer.allocUnsafe(20).fill(0);
export const BUFFER_EMPTY = Buffer.allocUnsafe(0);
export const BUFFER_ZERO = Buffer.allocUnsafe(1).fill(0);
export const RPCQUANTITY_ZERO = Quantity.from("0x0");