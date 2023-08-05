import Manager from "./manager";
import { Data, Quantity, BUFFER_EMPTY, BUFFER_ZERO } from "@ganache/utils";
import Blockchain from "../blockchain";
import { InternalTransactionReceipt } from "@ganache/ethereum-transaction";
import { Address } from "@ganache/ethereum-address";
import { GanacheLevelUp } from "../database";

export default class TransactionReceiptManager extends Manager<InternalTransactionReceipt> {
  #blockchain: Blockchain;
  constructor(base: GanacheLevelUp, blockchain: Blockchain) {
    super(base, InternalTransactionReceipt);
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
        res.status === "0x1" ? Quantity.One.toBuffer() : BUFFER_ZERO;
      const cumulativeGasUsed = Quantity.toBuffer(res.cumulativeGasUsed);
      const logsBloom = Data.toBuffer(res.logsBloom, 256);
      const logs = res.logs.map(log => [
        Address.from(log.address).toBuffer(),
        log.topics.map(topic => Data.toBuffer(topic)),
        Array.isArray(log.data)
          ? log.data.map(data => Data.toBuffer(data))
          : Data.toBuffer(log.data)
      ]);
      const gasUsed = Quantity.toBuffer(res.gasUsed);
      const contractAddress =
        res.contractAddress == null
          ? BUFFER_EMPTY
          : Address.from(res.contractAddress).toBuffer();
      return InternalTransactionReceipt.fromValues(
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
