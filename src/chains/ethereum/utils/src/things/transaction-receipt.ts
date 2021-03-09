import { FrozenTransaction } from "./transaction";
import { encode as rlpEncode, decode as rlpDecode } from "rlp";
import { Data, Quantity } from "@ganache/utils";
import { BlockLogs, TransactionLog } from "./blocklogs";
import { utils } from "@ganache/utils";
import { Block } from "./runtime-block";

const STATUSES = [utils.RPCQUANTITY_ZERO, utils.RPCQUANTITY_ONE];

type OmitLastType<T extends [unknown, ...Array<unknown>]> = T extends [
  ...infer A,
  infer _L
]
  ? A
  : never;
type FullRawReceipt = [
  status: Buffer,
  cumulativeGasUsed: Buffer,
  logsBloom: Buffer,
  logs: Buffer[],
  gasUsed: Buffer,
  contractAddress: Buffer | null
];
type RawReceipt = OmitLastType<OmitLastType<FullRawReceipt>>;

export class TransactionReceipt {
  public contractAddress: Buffer;
  #gasUsed: Buffer;
  raw: RawReceipt;

  constructor(data?: Buffer) {
    if (data) {
      const decoded = (rlpDecode(data) as unknown) as FullRawReceipt;
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
    logs: Buffer[],
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
    logs: Buffer[],
    gasUsed: Buffer,
    contractAddress: Buffer
  ) {
    const receipt = new TransactionReceipt();
    receipt.#init(
      status,
      cumulativeGasUsed,
      logsBloom,
      logs,
      contractAddress,
      gasUsed
    );
    return receipt;
  }

  public serialize(all: boolean) {
    if (all) {
      // the database format includes the contractAddress:
      return rlpEncode([
        ...this.raw,
        this.#gasUsed,
        this.contractAddress
      ] as FullRawReceipt);
    } else {
      // receipt trie format:
      return rlpEncode(this.raw);
    }
  }

  public toJSON(block: Block, transaction: FrozenTransaction) {
    const raw = this.raw;
    const contractAddress =
      this.contractAddress.length === 0
        ? null
        : Data.from(this.contractAddress);
    const blockHash = block.hash();
    const blockNumber = block.header.number;
    const blockLog = BlockLogs.create(blockHash.toBuffer());
    const transactionHash = transaction.hash;
    const transactionHashBuffer = transactionHash.toBuffer();
    const transactionIndexBuffer = transaction.index.toBuffer();
    blockLog.blockNumber = blockNumber;
    ((raw[3] as any) as TransactionLog[]).forEach(log => {
      blockLog.append(transactionIndexBuffer, transactionHashBuffer, log);
    });
    const logs = [...blockLog.toJSON()];
    return {
      transactionHash,
      transactionIndex: transaction.index,
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
