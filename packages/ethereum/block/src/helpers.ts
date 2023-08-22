import { Data, Quantity } from "@ganache/utils";
import { EthereumRawBlockHeader } from "./serialize";

export type BlockHeader = {
  parentHash: Data;
  sha3Uncles: Data;
  miner: Data;
  stateRoot: Data;
  transactionsRoot: Data;
  receiptsRoot: Data;
  logsBloom: Data;
  difficulty: Quantity;
  totalDifficulty: Quantity;
  number: Quantity;
  gasLimit: Quantity;
  gasUsed: Quantity;
  timestamp: Quantity;
  extraData: Data;
  mixHash: Data;
  nonce: Data;
  baseFeePerGas?: Quantity;
  withdrawalsRoot?: Data;
};

export function makeHeader(
  raw: EthereumRawBlockHeader,
  totalDifficulty: Buffer
): BlockHeader {
  return {
    parentHash: Data.from(raw[0], 32),
    sha3Uncles: Data.from(raw[1], 32),
    miner: Data.from(raw[2], 20),
    stateRoot: Data.from(raw[3], 32),
    transactionsRoot: Data.from(raw[4], 32),
    receiptsRoot: Data.from(raw[5], 32),
    logsBloom: Data.from(raw[6], 256),
    difficulty: Quantity.from(raw[7], false),
    number: Quantity.from(raw[8], false),
    gasLimit: Quantity.from(raw[9], false),
    gasUsed: Quantity.from(raw[10], false),
    timestamp: Quantity.from(raw[11], false),
    extraData: Data.from(raw[12]),
    mixHash: Data.from(raw[13], 32),
    nonce: Data.from(raw[14], 8),
    totalDifficulty: Quantity.from(totalDifficulty, false),
    baseFeePerGas:
      raw[15] === undefined ? undefined : Quantity.from(raw[15], false),
    withdrawalsRoot: raw[16] === undefined ? undefined : Data.from(raw[16], 32)
  };
}
