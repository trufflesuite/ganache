import { Data, Quantity } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import { EIP1559FeeMarketTransaction } from "./eip1559-fee-market-transaction";
import { EIP2930AccessListTransaction } from "./eip2930-access-list-transaction";
import { LegacyTransaction } from "./legacy-transaction";
import { AccessList } from "./access-lists";

export type TypedTransaction =
  | LegacyTransaction
  | EIP2930AccessListTransaction
  | EIP1559FeeMarketTransaction;

export type Capability = 2718 | 2930 | 1559;
export type TypedTransactionJSON =
  | LegacyTransactionJSON
  | EIP2930AccessListTransactionJSON
  | EIP1559FeeMarketTransactionJSON;

export type LegacyTransactionJSON = {
  hash: Data;
  type?: Quantity;
  nonce: Quantity;
  blockHash: Data;
  blockNumber: Quantity;
  transactionIndex: Quantity;
  from: Address;
  to: Address;
  value: Quantity;
  gas: Quantity;
  gasPrice: Quantity;
  input: Data;
  v: Quantity;
  r: Quantity;
  s: Quantity;
};

export type EIP2930AccessListTransactionJSON = {
  hash: Data;
  type: Quantity;
  chainId: Quantity;
  nonce: Quantity;
  blockHash: Data;
  blockNumber: Quantity;
  transactionIndex: Quantity;
  from: Address;
  to: Address;
  value: Quantity;
  gas: Quantity;
  gasPrice: Quantity;
  input: Data;
  accessList: AccessList;
  v: Quantity;
  r: Quantity;
  s: Quantity;
};

export type EIP1559FeeMarketTransactionJSON = {
  hash: Data;
  type: Quantity;
  chainId: Quantity;
  nonce: Quantity;
  blockHash: Data;
  blockNumber: Quantity;
  transactionIndex: Quantity;
  from: Address;
  to: Address;
  value: Quantity;
  maxPriorityFeePerGas: Quantity;
  maxFeePerGas: Quantity;
  gasPrice: Quantity;
  gas: Quantity;
  input: Data;
  accessList: AccessList;
  v: Quantity;
  r: Quantity;
  s: Quantity;
};
