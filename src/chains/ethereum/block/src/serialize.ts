import {
  GanacheRawBlockTransactionMetaData,
  LegacyRawTransaction
} from "@ganache/ethereum-transaction";
import { digest, encodeLength, encodeRange, encode } from "@ganache/rlp";
import { uintToBuffer } from "@ganache/utils";

export type WithdrawalRaw = [
  index: Buffer,
  validatorIndex: Buffer,
  address: Buffer,
  amount: Buffer
];

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

type _EthereumRawBlock = [
  rawHeader: EthereumRawBlockHeader,
  rawTransactions: (Buffer | LegacyRawTransaction)[],
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
