import {
  EthereumRawTx,
  GanacheRawBlockTransactionMetaData
} from "@ganache/ethereum-transaction";
import { digest, encodeLength, encodeRange, encode } from "@ganache/rlp";
import { uintToBuffer } from "@ganache/utils";

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
  nonce: Buffer
];
export type EthereumRawBlock = [
  rawHeader: EthereumRawBlockHeader,
  rawTransactions: EthereumRawTx[],
  uncles: []
];
type Head<T extends any[]> = T extends [...infer Head, any] ? Head : any[];

export type GanacheRawBlock = [...EthereumRawBlock, ...GanacheRawBlockExtras];
export function serialize(
  raw: Head<GanacheRawBlock>
): { serialized: Buffer; size: number } {
  const serializedStart = encodeRange(raw, 0, 3);
  const serializedLength = serializedStart.length;
  const ethereumRawBlockSize = encodeLength(serializedLength, 192).length;
  const size = ethereumRawBlockSize + serializedLength;
  const middle = encodeRange(raw, 3, 2);
  const ending = encode(uintToBuffer(size));
  return {
    serialized: digest(
      [serializedStart.output, middle.output, [ending]],
      serializedLength + middle.length + ending.length
    ),
    size
  };
}
