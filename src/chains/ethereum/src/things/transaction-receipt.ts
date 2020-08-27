import Transaction from "./transaction";
import {Block} from "../components/block-manager";
import {encode as rlpEncode, decode as rlpDecode} from "rlp";
import {Data, Quantity} from "@ganache/utils";
import BlockLogs, { TransactionLog } from "./blocklogs";

type OmitLastType<T extends [unknown, ...Array<unknown>]> = T extends [...infer A, infer _L] ? A : never;
type FullRawReceipt = [status: Buffer, gasUsed: Buffer, logsBloom: Buffer, logs: Buffer[], contractAddress: Buffer | null];
type RawReceipt = OmitLastType<FullRawReceipt>

export default class TransactionReceipt {
  public contractAddress: Buffer;
  raw: RawReceipt;

  constructor(data?: Buffer) {
    if (data) {
      const decoded = (rlpDecode(data) as unknown) as FullRawReceipt;
      this.#init(decoded[0], decoded[1], decoded[2], decoded[3], decoded[4]);
    }
  }
  #init = (status: Buffer, gasUsed: Buffer, logsBloom: Buffer, logs: Buffer[], contractAddress: Buffer = null) => {
    this.raw = [status, gasUsed, logsBloom, logs];
    this.contractAddress = contractAddress;
  }

  static fromValues(status: Buffer, gasUsed: Buffer, logsBloom: Buffer, logs: Buffer[], contractAddress: Buffer) {
    const receipt = new TransactionReceipt();
    receipt.#init(status, gasUsed, logsBloom, logs, contractAddress);
    return receipt;
  }

  public serialize(all: boolean) {
    if (all) {
      // the database format includes the contractAddress:
      return rlpEncode([...this.raw, this.contractAddress] as FullRawReceipt);
    } else {
      // receipt trie format:
      return rlpEncode(this.raw);
    }
  }

  public toJSON(block: Block, transaction: Transaction) {
    const raw = this.raw;
    const contractAddress = Data.from(this.contractAddress).toJSON()
    const blockLog = BlockLogs.create(block.value.hash());
    blockLog.blockNumber = Quantity.from(block.value.header.number);
    (raw[3] as any as TransactionLog[]).forEach(log => {
      blockLog.append(transaction._index, transaction.hash(), log);
    });
    const logs = [...blockLog.toJSON()];
    return {
      transactionHash: Data.from(transaction.hash()),
      transactionIndex: Quantity.from((transaction as any)._index),
      blockNumber: Quantity.from(block.value.header.number),
      blockHash: Data.from(block.value.hash()),
      from: Data.from(transaction.from),
      to: contractAddress === "0x" ? Data.from(transaction.to) : null,
      cumulativeGasUsed: Quantity.from(block.value.header.gasUsed),
      gasUsed: Quantity.from(raw[1]),
      contractAddress: contractAddress === "0x" ? null : contractAddress,
      logs,
      logsBloom: Data.from(raw[2], 256),
      status: raw[0][0]
    };
  }
}
