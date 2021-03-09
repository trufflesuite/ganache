/**
 * The raw data for an ethereum transaction.
 */
export type EthereumRawTx = [
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

/**
 * Extra data Ganache stores as part of a transaction in order to support
 * account mascarading and quick lookups for transactions, blocks, and receipts.
 */
export type GanacheRawExtraTx = [
  from: Buffer,
  hash: Buffer,
  blockHash: Buffer,
  blockNumber: Buffer,
  index: Buffer
];

/**
 * Meta data Ganache stores as part of a transaction *in a block*
 */
export type GanacheRawBlockTransactionMetaData = [from: Buffer, hash: Buffer];
