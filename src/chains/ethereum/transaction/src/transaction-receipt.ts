import { Address } from "@ganache/ethereum-address";
import { BlockLogs, TransactionLog } from "@ganache/ethereum-utils";
import { decode, digest, encodeRange } from "@ganache/rlp";
import { Data, Quantity } from "@ganache/utils";
import { AccessList } from "./access-lists";
import type { Common } from "@ethereumjs/common";
import { TypedTransaction } from "./transaction-types";

const STATUSES = [Quantity.Zero, Quantity.One];

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

export interface TransactionReceipt {
  transactionHash: Data;
  transactionIndex: Quantity;
  blockNumber: Quantity;
  blockHash: Data;
  from: Address;
  to: Address;
  cumulativeGasUsed: Quantity;
  gasUsed: Quantity;
  contractAddress: Data;
  logs: {
    address: Address;
    blockHash: Data;
    blockNumber: Quantity;
    data: Data | Data[];
    logIndex: Quantity;
    removed: boolean;
    topics: Data | Data[];
    transactionHash: Data;
    transactionIndex: Quantity;
  }[];
  logsBloom: Data;
  status: Quantity;
  type?: Quantity;
  chainId?: Quantity;
  accessList?: AccessList;
  effectiveGasPrice: Quantity;
}

export class InternalTransactionReceipt {
  public contractAddress: Buffer;
  public gasUsed: Buffer;
  raw: EthereumRawReceipt;
  encoded: { length: number; output: Buffer[] };
  txType: Quantity;

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
    contractAddress: Buffer = null,
    type: Quantity = null
  ) => {
    this.raw = [status, cumulativeGasUsed, logsBloom, logs];
    this.contractAddress = contractAddress;
    this.gasUsed = gasUsed;
    this.txType = type;
  };

  static fromValues(
    status: Buffer,
    cumulativeGasUsed: Buffer,
    logsBloom: Buffer,
    logs: TransactionLog[],
    gasUsed: Buffer,
    contractAddress: Buffer,
    type: Quantity = null
  ) {
    const receipt = new InternalTransactionReceipt();
    receipt.#init(
      status,
      cumulativeGasUsed,
      logsBloom,
      logs,
      gasUsed,
      contractAddress,
      type
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
        this.gasUsed,
        this.contractAddress
      ];
      const epilogue = encodeRange(extras, 0, 2);
      return digest(
        [this.encoded.output, epilogue.output],
        this.encoded.length + epilogue.length
      );
    } else {
      // receipt trie format:
      const serialized = digest([this.encoded.output], this.encoded.length);
      return this.txType
        ? Buffer.concat([this.txType.toBuffer(), serialized])
        : serialized;
    }
  }

  public toJSON(transaction: TypedTransaction, common: Common) {
    const raw = this.raw;
    const contractAddress =
      this.contractAddress.length === 0
        ? null
        : Data.from(this.contractAddress);
    const { blockHash, blockNumber } = transaction;
    const blockLog = BlockLogs.create(blockHash);
    const transactionHash = transaction.hash;
    const transactionIndex = transaction.index;
    blockLog.blockNumber = blockNumber;
    raw[3].forEach(l => blockLog.append(transactionIndex, transactionHash, l));
    const logs = [...blockLog.toJSON()];
    const json: TransactionReceipt = {
      transactionHash,
      transactionIndex,
      blockNumber,
      blockHash,
      from: transaction.from,
      to: contractAddress ? null : transaction.to,
      cumulativeGasUsed: Quantity.from(raw[1]),
      gasUsed: Quantity.from(this.gasUsed),
      contractAddress,
      logs,
      logsBloom: Data.from(raw[2], 256),
      status: STATUSES[raw[0][0]],
      effectiveGasPrice: transaction.effectiveGasPrice
    };
    if (transaction.type && common.isActivatedEIP(2718)) {
      json.type = transaction.type;
    }
    return json;
  }
}
