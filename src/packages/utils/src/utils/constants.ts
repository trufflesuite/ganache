import { Data } from "../things/json-rpc/json-rpc-data";
import { Quantity } from "../things/json-rpc/json-rpc-quantity";

export const BUFFER_256_ZERO = Buffer.allocUnsafe(256).fill(0);
export const ACCOUNT_ZERO = BUFFER_256_ZERO.slice(0, 20);
export const BUFFER_EMPTY = Buffer.allocUnsafe(0);
export const BUFFER_ZERO = BUFFER_256_ZERO.slice(0, 1);
export const BUFFER_32_ZERO = BUFFER_256_ZERO.slice(0, 32);
export const BUFFER_8_ZERO = BUFFER_256_ZERO.slice(0, 8);

export const DATA_EMPTY = Data.from(BUFFER_EMPTY);
export const RPCQUANTITY_EMPTY = Quantity.from(BUFFER_EMPTY, true);
export const RPCQUANTITY_ZERO = Quantity.from(BUFFER_ZERO);
export const RPCQUANTITY_ONE = Quantity.from(1n);
export const RPCQUANTITY_GWEI = Quantity.from(1000000000);
export const WEI = 1000000000000000000n as const;

export const KNOWN_CHAINIDS = new Set([1, 3, 4, 5, 42, 11155111]);
