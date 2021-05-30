// Address is a required import for Api Extractor.
import type { Address } from "@ganache/ethereum-address";

import { BlockLogs, TransactionLog } from "@ganache/ethereum-utils";
import { decode, digest, encodeRange } from "@ganache/rlp";
import { Data, Quantity } from "@ganache/utils";
import { RPCQUANTITY_ZERO, RPCQUANTITY_ONE } from "@ganache/utils";
import { FrozenTransaction } from "./frozen-transaction";

const STATUSES = [RPCQUANTITY_ZERO, RPCQUANTITY_ONE];

type EthereumRawReceipt = [
  status: Buffer,
  cumulativeGasUsed: Buffer,
  logsBloom: Buffer,
  logs: TransactionLog[]
];

type GanacheExtrasRawReceipt = [
  gasUsed: Buffer,
  contractAddress: Buffer | null
];

type GanacheRawReceipt = [...EthereumRawReceipt, ...GanacheExtrasRawReceipt];

export class TransactionReceipt {
  public contractAddress: Buffer;
  #gasUsed: Buffer;
  raw: EthereumRawReceipt;
  encoded: { length: number; output: Buffer[] };

  constructor(data?: Buffer) {
    if (data) {
      const decoded = decode<GanacheRawReceipt>(data);
      this.#init(
        decoded[0],
        decoded[1],
        decoded[2],
        decoded[3],
        decoded[4],
        decoded[5]
      );
    }
  }
  #init = (
    status: Buffer,
    cumulativeGasUsed: Buffer,
    logsBloom: Buffer,
    logs: TransactionLog[],
    gasUsed: Buffer,
    contractAddress: Buffer = null
  ) => {
    this.raw = [status, cumulativeGasUsed, logsBloom, logs];
    this.contractAddress = contractAddress;
    this.#gasUsed = gasUsed;
  };

  static fromValues(
    status: Buffer,
    cumulativeGasUsed: Buffer,
    logsBloom: Buffer,
    logs: TransactionLog[],
    gasUsed: Buffer,
    contractAddress: Buffer
  ) {
    const receipt = new TransactionReceipt();
    receipt.#init(
      status,
      cumulativeGasUsed,
      logsBloom,
      logs,
      gasUsed,
      contractAddress
    );
    return receipt;
  }

  public serialize(all: boolean): Buffer {
    if (this.encoded == null) {
      this.encoded = encodeRange(this.raw, 0, 4);
    }
    if (all) {
      // the database format includes gasUsed and the contractAddress:
      const extras: GanacheExtrasRawReceipt = [
        this.#gasUsed,
        this.contractAddress
      ];
      const epilogue = encodeRange(extras, 0, 2);
      return digest(
        [this.encoded.output, epilogue.output],
        this.encoded.length + epilogue.length
      );
    } else {
      // receipt trie format:
      return digest([this.encoded.output], this.encoded.length);
    }
  }

  public toJSON(
    block: { hash(): Data; header: { number: Quantity } },
    transaction: FrozenTransaction
  ) {
    const raw = this.raw;
    const contractAddress =
      this.contractAddress.length === 0
        ? null
        : Data.from(this.contractAddress);
    const blockHash = block.hash();
    const blockNumber = block.header.number;
    const blockLog = BlockLogs.create(blockHash);
    const transactionHash = transaction.hash;
    const transactionIndex = transaction.index;
    blockLog.blockNumber = blockNumber;
    raw[3].forEach(l => blockLog.append(transactionIndex, transactionHash, l));
    const logs = [...blockLog.toJSON()];

    return {
      transactionHash,
      transactionIndex,
      blockNumber,
      blockHash,
      from: transaction.from,
      to: contractAddress ? null : transaction.to,
      cumulativeGasUsed: Quantity.from(raw[1]),
      gasUsed: Quantity.from(this.#gasUsed),
      contractAddress,
      logs,
      logsBloom: Data.from(raw[2], 256),
      status: STATUSES[raw[0][0]]
    };
  }
}
