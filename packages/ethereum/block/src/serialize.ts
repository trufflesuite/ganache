import { Common } from "@ethereumjs/common";
import { Address } from "@ganache/ethereum-address";
import {
  GanacheRawBlockTransactionMetaData,
  GanacheRawExtraTx,
  LegacyRawTransaction,
  TransactionFactory,
  TypedRawTransaction
} from "@ganache/ethereum-transaction";
import {
  digest,
  encodeLength,
  encodeRange,
  encode,
  decode
} from "@ganache/rlp";
import { Data, Quantity, uintToBuffer } from "@ganache/utils";

export type WithdrawalRaw = [
  index: Buffer,
  validatorIndex: Buffer,
  address: Buffer,
  amount: Buffer
];

export type Withdrawal = {
  index: Quantity;
  validatorIndex: Quantity;
  address: Address;
  amount: Quantity;
};

export type GanacheRawBlockExtras = [
  totalDifficulty: Buffer,
  transactionMetaData: GanacheRawBlockTransactionMetaData[],
  ethereumRawBlockSize: Buffer
];
export type EthereumRawBlockHeader = [
  parentHash: Buffer,
  sha3Uncles: Buffer,
  miner: Buffer,
  stateRoot: Buffer,
  transactionsRoot: Buffer,
  receiptsRoot: Buffer,
  logsBloom: Buffer,
  difficulty: Buffer,
  number: Buffer,
  gasLimit: Buffer,
  gasUsed: Buffer,
  timestamp: Buffer,
  extraData: Buffer,
  mixHash: Buffer,
  nonce: Buffer,
  baseFeePerGas?: Buffer,
  withdrawalsRoot?: Buffer // added in shanghai
];

export type BlockRawTransaction = Buffer | LegacyRawTransaction;

type _EthereumRawBlock = [
  rawHeader: EthereumRawBlockHeader,
  rawTransactions: BlockRawTransaction[],
  uncles: [],
  withdrawals: WithdrawalRaw[]
];

export type EthereumRawBlock = _EthereumRawBlock | Head<_EthereumRawBlock>;

/**
 * Omits the last element from a Tuple
 */
export type Head<T extends any[]> = T extends [...infer Head, any]
  ? Head
  : any[];

export type GanacheRawBlock = [...EthereumRawBlock, ...GanacheRawBlockExtras];

/**
 * Serializes a block to compute its size and store it in the database.
 * @param start
 * @param end
 * @returns
 */
export function serialize(
  start: Head<EthereumRawBlock> | EthereumRawBlock,
  end: Head<GanacheRawBlockExtras>
): {
  serialized: Buffer;
  size: number;
} {
  const serializedStart = encodeRange(start, 0, start.length);
  const serializedLength = serializedStart.length;
  const ethereumRawBlockSize = encodeLength(serializedLength, 192).length;
  const size = ethereumRawBlockSize + serializedLength;
  const middle = encodeRange(end, 0, 2);
  const ending = encode(uintToBuffer(size));
  return {
    serialized: digest(
      [serializedStart.output, middle.output, [ending]],
      serializedLength + middle.length + ending.length
    ),
    size
  };
}

function isLegacyRawTransaction(
  raw: BlockRawTransaction
): raw is LegacyRawTransaction {
  return raw.length === 9;
}

/**
 * Converts a raw transaction encoded for use in a raw block into a `Transaction`
 *
 * @param raw the raw transaction data after the block has been rlp decoded.
 * @param common
 * @param extra
 * @returns
 */
export function blockTransactionFromRaw(
  raw: BlockRawTransaction,
  common: Common,
  extra: GanacheRawExtraTx
) {
  let txData: TypedRawTransaction;
  let type: number;
  if (isLegacyRawTransaction(raw)) {
    // legacy txs
    type = 0;
    txData = raw;
  } else {
    // type 1 and 2 txs
    type = raw[0];
    txData = decode(raw.subarray(1));
  }
  return TransactionFactory.fromSafeTypeAndTxData(type, txData, common, extra);
}

export function convertRawWithdrawals([
  index,
  validatorIndex,
  address,
  amount
]: WithdrawalRaw): Withdrawal {
  return {
    index: Quantity.from(index),
    validatorIndex: Quantity.from(validatorIndex),
    address: Address.from(address),
    amount: Quantity.from(amount)
  };
}
