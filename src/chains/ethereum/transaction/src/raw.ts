import { AccessListBuffer } from "@ethereumjs/tx";
/**
 * The raw data for an ethereum transaction.
 */
export type RawLegacyTx =
  | [
      nonce: Buffer,
      gasPrice: Buffer,
      gas: Buffer,
      to: Buffer,
      value: Buffer,
      data: Buffer,
      v: Buffer,
      r: Buffer,
      s: Buffer
    ]
  | [
      type: Buffer,
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

type Concat<T extends unknown[], U extends unknown[]> = [...T, ...U];

type TxType = [type: Buffer];

export type RawAccessListPayload = [
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

export type RawAccessListTx = Concat<TxType, RawAccessListPayload>;
export type TypedRawTransaction = RawLegacyTx | RawAccessListTx;

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
