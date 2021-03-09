import { Data, Quantity } from "@ganache/utils";
import { Address } from "../address";

export interface BaseTransaction {
  hash: () => Data;
  from: Address;
  nonce: Quantity;
  gasPrice: Quantity;
  gasLimit: Quantity;
  to: Address;
  value: Quantity;
  data: Data;
}
