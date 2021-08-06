import { LevelUp } from "levelup";
import Manager from "./manager";
import {
  Data,
  Quantity,
  BUFFER_EMPTY,
  RPCQUANTITY_ONE,
  BUFFER_ZERO
} from "@ganache/utils";
import Blockchain from "../blockchain";
import { TransactionReceipt } from "@ganache/ethereum-transaction";
import { Address } from "@ganache/ethereum-address";

export default class TransactionReceiptManager extends Manager<TransactionReceipt> {
  #blockchain: Blockchain;
  constructor(base: LevelUp, blockchain: Blockchain) {
    super(base, TransactionReceipt);
    this.#blockchain = blockchain;
  }

  async get(key: string | Buffer) {
    const receipt = await super.get(key);
    if (receipt) {
      return receipt;
    } else if (this.#blockchain.fallback) {
      const res = await this.#blockchain.fallback.request<any | null>(
        "eth_getTransactionReceipt",
        [typeof key === "string" ? key : Data.from(key)]
      );
      if (!res) return null;

      const status =
        res.status === "0x1" ? RPCQUANTITY_ONE.toBuffer() : BUFFER_ZERO;
      const cumulativeGasUsed = Quantity.from(res.cumulativeGasUsed).toBuffer();
      const logsBloom = Data.from(res.logsBloom, 256).toBuffer();
      const logs = res.logs.map(log => ({
        address: Address.from(log.address),
        topics: log.topics.map(topic => Data.from(topic)),
        data: Array.isArray(log.data)
          ? log.data.map(data => Data.from(data).toBuffer())
          : Data.from(log.data).toBuffer()
      }));
      const gasUsed = Quantity.from(res.gasUsed).toBuffer();
      const contractAddress =
        res.contractAddress == null
          ? BUFFER_EMPTY
          : Address.from(res.contractAddress).toBuffer();
      return TransactionReceipt.fromValues(
        status,
        cumulativeGasUsed,
        logsBloom,
        logs,
        gasUsed,
        contractAddress
      );
    }
  }
}
