import { Data, Quantity } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import { EIP2930AccessListTransaction } from "./eip2930-access-list-transaction";
import { LegacyTransaction } from "./legacy-transaction";
import { EIP2930AccessListDatabaseTx } from "./raw";
import { AccessList } from "@ethereumjs/tx";

export type TypedTransaction = LegacyTransaction | EIP2930AccessListTransaction;
export type Capability = 2718 | 2930;
export type TypedTransactionJSON =
  | LegacyTransactionJSON
  | EIP2930AccessListDatabaseTx;

export type LegacyTransactionJSON = {
  hash: Data;
  type?: Quantity;
  nonce: Quantity;
  blockHash: Data;
  blockNumber: Quantity;
  transactionIndex: Quantity;
  from: Data;
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
  from: Data;
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
