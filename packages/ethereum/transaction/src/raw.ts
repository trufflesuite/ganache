import { AccessListBuffer } from "./access-lists";
/**
 * The raw data for an ethereum transaction.
 */

type Concat<T extends unknown[], U extends unknown[]> = [...T, ...U];

type TxType = [type: Buffer];

export type LegacyRawTransaction = [
  nonce: Buffer,
  gasPrice: Buffer,
  gas: Buffer,
  to: Buffer,
  value: Buffer,
  data: Buffer,
  v: Buffer,
  r: Buffer,
  s: Buffer
];

export type EIP2930AccessListRawTransaction = [
  chainId: Buffer,
  nonce: Buffer,
  gasPrice: Buffer,
  gas: Buffer,
  to: Buffer,
  value: Buffer,
  data: Buffer,
  accessList: AccessListBuffer,
  v: Buffer,
  r: Buffer,
  s: Buffer
];

export type EIP1559FeeMarketRawTransaction = [
  chainId: Buffer,
  nonce: Buffer,
  maxPriorityFeePerGas: Buffer,
  maxFeePerGas: Buffer,
  gas: Buffer,
  to: Buffer,
  value: Buffer,
  data: Buffer,
  accessList: AccessListBuffer,
  v: Buffer,
  r: Buffer,
  s: Buffer
];

export type EIP2930AccessListDatabaseTx = Concat<
  TxType,
  EIP2930AccessListRawTransaction
>;

export type EIP1559FeeMarketDatabaseTx = Concat<
  TxType,
  EIP1559FeeMarketRawTransaction
>;

export type TypedDatabaseTransaction =
  | LegacyRawTransaction
  | EIP2930AccessListDatabaseTx
  | EIP1559FeeMarketDatabaseTx;
export type TypedRawTransaction =
  | LegacyRawTransaction
  | EIP2930AccessListRawTransaction
  | EIP1559FeeMarketRawTransaction;

/**
 * Extra data Ganache stores as part of a transaction in order to support
 * account masquerading and quick lookups for transactions, blocks, and receipts.
 */
export type GanacheRawExtraTx = [
  from: Buffer,
  hash: Buffer,
  blockHash: Buffer,
  blockNumber: Buffer,
  index: Buffer,
  effectiveGasPrice?: Buffer
];

/**
 * Meta data Ganache stores as part of a transaction *in a block*
 */
export type GanacheRawBlockTransactionMetaData = [from: Buffer, hash: Buffer];
