import { BlockLogs, FilterArgs } from "@ganache/ethereum-utils";
import Manager from "./manager";
import { Quantity } from "@ganache/utils";
import Blockchain from "../blockchain";
import { parseFilter, parseFilterDetails } from "../helpers/filter-parsing";
import { Ethereum } from "../api-types";
import { GanacheLevelUp } from "../database";

export default class BlockLogManager extends Manager<BlockLogs> {
  #blockchain: Blockchain;

  constructor(base: GanacheLevelUp, blockchain: Blockchain) {
    super(base, BlockLogs);
    this.#blockchain = blockchain;
  }

  async get(key: string | Buffer) {
    const log = await super.get(key);
    if (log) {
      log.blockNumber = Quantity.from(key);
    } else if (this.#blockchain.fallback) {
      const block = Quantity.from(key);
      if (this.#blockchain.fallback.isValidForkBlockNumber(block)) {
        const res = await this.#blockchain.fallback.request<any[] | null>(
          "eth_getLogs",
          [{ fromBlock: block, toBlock: block }]
        );
        return BlockLogs.fromJSON(res);
      }
    }
    return log;
  }

  async getLogs(filter: FilterArgs): Promise<Ethereum.Logs> {
    const blockchain = this.#blockchain;
    if ("blockHash" in filter) {
      const { addresses, topics } = parseFilterDetails(filter);
      const blockNumber = await blockchain.blocks.getNumberFromHash(
        filter.blockHash
      );
      if (!blockNumber) {
        return [];
      }
      const logs = await this.get(blockNumber.toBuffer());
      return logs ? [...logs.filter(addresses, topics)] : [];
    }
    const { fromBlock, toBlock } = parseFilter(filter, blockchain);
    if (fromBlock.toBigInt() > toBlock.toBigInt()) {
      throw new Error(
        "One of the blocks specified in filter (fromBlock, toBlock or blockHash) cannot be found."
      );
    }

    const fork = this.#blockchain.fallback;
    if (!fork) {
      return await this.getLocal(
        fromBlock.toNumber(),
        toBlock.toNumber(),
        filter
      );
    }
    const from = Quantity.min(fromBlock, toBlock);
    const ret: Ethereum.Logs = [];
    if (fork.isValidForkBlockNumber(from)) {
      ret.push(
        ...(await this.getFromFork(
          from,
          Quantity.min(toBlock, fork.blockNumber),
          filter
        ))
      );
    }
    if (!fork.isValidForkBlockNumber(toBlock)) {
      ret.push(
        ...(await this.getLocal(
          Math.max(from.toNumber(), fork.blockNumber.toNumber() + 1),
          toBlock.toNumber(),
          filter
        ))
      );
    }
    return ret;
  }

  getLocal(
    from: number,
    to: number,
    filter: FilterArgs
  ): Promise<Ethereum.Logs> {
    const { addresses, topics } = parseFilterDetails(filter);
    const pendingLogsPromises: Promise<BlockLogs>[] = [];
    for (let i = from; i <= to; i++) {
      pendingLogsPromises.push(this.get(Quantity.toBuffer(i)));
    }
    return Promise.all(pendingLogsPromises).then(blockLogsRange => {
      const filteredBlockLogs: Ethereum.Logs = [];
      blockLogsRange.forEach(blockLogs => {
        // TODO(perf): this loops over all addresses for every block.
        // Maybe make it loop only once?
        // Issue: https://github.com/trufflesuite/ganache/issues/3482
        if (blockLogs)
          filteredBlockLogs.push(...blockLogs.filter(addresses, topics));
      });
      return filteredBlockLogs;
    });
  }

  async getFromFork(
    from: Quantity,
    to: Quantity,
    filter: FilterArgs
  ): Promise<Ethereum.Logs> {
    const { topics } = parseFilterDetails(filter);
    const f = this.#blockchain.fallback;
    if (!f || !f.isValidForkBlockNumber(from)) {
      return [];
    }
    return await f.request<Ethereum.Logs | null>("eth_getLogs", [
      {
        fromBlock: from,
        toBlock: f.selectValidForkBlockNumber(to),
        address: filter.address
          ? Array.isArray(filter.address)
            ? filter.address
            : [filter.address]
          : [],
        topics
      }
    ]);
  }
}
