import Transaction from "./transaction";
import {Block} from "../components/block-manager";
import {encode as rlpEncode, decode as rlpDecode} from "rlp";
import {Data, Quantity} from "@ganache/utils/src/things/json-rpc";

type OmitLastType<T extends [unknown, ...Array<unknown>]> = T extends [...infer A, infer _L] ? A : never;
type FullRawReceipt = [status: Buffer, gasUsed: Buffer, logsBloom: Buffer, logs: Buffer[], contractAddress: Buffer | null];
type RawReceipt = OmitLastType<FullRawReceipt>

export default class TransactionReceipt {
  #contractAddress: Buffer;
  #raw: RawReceipt;

  constructor(data?: Buffer) {
    if (data) {
      const decoded = (rlpDecode(data) as unknown) as FullRawReceipt;
      this.#init(decoded[0], decoded[1], decoded[2], decoded[3], decoded[4]);
    }
  }
  #init = (status: Buffer, gasUsed: Buffer, logsBloom: Buffer, logs: Buffer[], contractAddress: Buffer = null) => {
    this.#raw = [status, gasUsed, logsBloom, logs];
    this.#contractAddress = contractAddress;
  }

  static fromValues(status: Buffer, gasUsed: Buffer, logsBloom: Buffer, logs: Buffer[], contractAddress: Buffer) {
    const receipt = new TransactionReceipt();
    receipt.#init(status, gasUsed, logsBloom, logs, contractAddress);
    return receipt;
  }

  public serialize(all: boolean) {
    if (all) {
      // the database format includes the contractAddress:
      return rlpEncode([...this.#raw, this.#contractAddress] as FullRawReceipt);
    } else {
      // receipt trie format:
      return rlpEncode(this.#raw);
    }
  }

  public toJSON(block: Block, transaction: Transaction) {
    const raw = this.#raw;
    const contractAddress = Data.from(this.#contractAddress).toJSON()
    return {
      transactionHash: Data.from(transaction.hash()),
      transactionIndex: Quantity.from((transaction as any)._index),
      blockNumber: Quantity.from(block.value.header.number),
      blockHash: Data.from(block.value.hash()),
      cumulativeGasUsed: Quantity.from(block.value.header.gasUsed),
      gasUsed: Quantity.from(raw[1]),
      contractAddress: contractAddress === "0x" ? null : contractAddress,
      logs: raw[3], // TODO: figure this out
      logsBloom: Data.from(raw[2], 256),
      // flips a `1` to a `0` and a `0` to a `1` using Bitwise XOR for funsies.
      status: 1 ^ raw[0][0]
    };
  }
}
