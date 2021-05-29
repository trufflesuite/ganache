import { BlockLogs, FilterArgs } from "@ganache/ethereum-utils";
import { LevelUp } from "levelup";
import Manager from "./manager";
import Blockchain from "../blockchain";
import { parseFilter, parseFilterDetails } from "../helpers/filter-parsing";

// Data and Address are required imports for Api Extractor.
import { Data, Quantity } from "@ganache/utils";
import type { Address } from "@ganache/ethereum-address";

export default class BlockLogManager extends Manager<BlockLogs> {
  #blockchain: Blockchain;
  constructor(base: LevelUp, blockchain: Blockchain) {
    super(base, BlockLogs);
    this.#blockchain = blockchain;
  }

  async get(key: string | Buffer) {
    const log = await super.get(key);
    if (log) {
      log.blockNumber = Quantity.from(key);
    } else if (this.#blockchain.fallback) {
      const block = Quantity.from(key);
      const res = await this.#blockchain.fallback.request<any[] | null>(
        "eth_getLogs",
        [{ fromBlock: block, toBlock: block }]
      );
      return BlockLogs.fromJSON(res);
    }
    return log;
  }

  async getLogs(filter: FilterArgs) {
    const blockchain = this.#blockchain;
    if ("blockHash" in filter) {
      const { addresses, topics } = parseFilterDetails(filter);
      const blockNumber = await blockchain.blocks.getNumberFromHash(
        filter.blockHash
      );
      if (!blockNumber) return [];

      const logs = await this.get(blockNumber);
      return logs ? [...logs.filter(addresses, topics)] : [];
    } else {
      const { addresses, topics, fromBlock, toBlockNumber } = parseFilter(
        filter,
        blockchain
      );

      const pendingLogsPromises: Promise<BlockLogs>[] = [
        this.get(fromBlock.toBuffer())
      ];

      const fromBlockNumber = fromBlock.toNumber();
      // if we have a range of blocks to search, do that here:
      if (fromBlockNumber !== toBlockNumber) {
        // fetch all the blockLogs in-between `fromBlock` and `toBlock` (excluding
        // from, because we already started fetching that one)
        for (let i = fromBlockNumber + 1, l = toBlockNumber + 1; i < l; i++) {
          pendingLogsPromises.push(this.get(Quantity.from(i).toBuffer()));
        }
      }

      // now filter and compute all the blocks' blockLogs (in block order)
      return Promise.all(pendingLogsPromises).then(blockLogsRange => {
        const filteredBlockLogs: ReturnType<
          typeof BlockLogs["logToJSON"]
        >[] = [];
        blockLogsRange.forEach(blockLogs => {
          // TODO(perf): this loops over all addresses for every block.
          // Maybe make it loop only once?
          if (blockLogs)
            filteredBlockLogs.push(...blockLogs.filter(addresses, topics));
        });
        return filteredBlockLogs;
      });
    }
  }
}
