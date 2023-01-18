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

  // A batch is a multicall operation, not necessarily sequential data access.
  // A batch of ops against our db will be processed 1 by 1 and returned.
  // forked batches will be sent to the api
  async batch(keys: string[] | Buffer[]) {
    if (!keys.length) return [];

    if (this.#blockchain.fallback) {
      const { fallback } = this.#blockchain;

      // Create the batch payload
      const params = keys.map(key => {
        return [key];
      });

      // the method is included because it is required to key the cache.
      const json = JSON.parse(
        await fallback.batch<any>("eth_getTransactionReceipt", params)
      );

      return json.map(data => {
        if (!data || !data.result) return null;

        const res = data.result;

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
      });
    } else {
      // loop over get
      return await Promise.all(
        keys.map(async key => {
          return await this.get(key);
        })
      );
    }
  }
}
