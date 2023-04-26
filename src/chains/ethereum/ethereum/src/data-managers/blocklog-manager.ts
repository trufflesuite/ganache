import { BlockLogs, FilterArgs } from "@ganache/ethereum-utils";
import Manager from "./manager";
import { Quantity } from "@ganache/utils";
import Blockchain from "../blockchain";
import { parseFilter, parseFilterDetails } from "../helpers/filter-parsing";
import { Ethereum } from "../api-types";
import { GanacheLevelUp } from "../database";
type Topic = string | string[];

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
      const res = await this.#blockchain.fallback.request<any[] | null>(
        "eth_getLogs",
        [{ fromBlock: block, toBlock: block }]
      );
      return BlockLogs.fromJSON(res);
    }
    return log;
  }

  async getRange(fromBlockNumber: string | Buffer, toBlockNumber: string | Buffer, topics: Topic[], address: String | String[]) {
    const blockchain = this.#blockchain;
    if (!blockchain.fallback){
      throw new Error("Not a forked instance");
    }
    const res = await this.#blockchain.fallback.request<any[] | null>(
      "eth_getLogs",
      [{ address, topics, fromBlock: Quantity.from(fromBlockNumber), toBlock: Quantity.from(toBlockNumber) }]
    );
    return BlockLogs.fromJSON(res);

  }

  async getLogs(filter: FilterArgs): Promise<Ethereum.Logs> {
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
      const pendingLogsPromises: Promise<BlockLogs>[] = [];

      const fromBlockNumber = fromBlock.toNumber();
      // if we have a range of blocks to search, do that here:
      if (fromBlockNumber !== toBlockNumber) {
        if (
          !blockchain.fallback || // We're not a forked chain
          blockchain.fallback.blockNumber < fromBlock // Or we are, but only querying post-fork
        ) {
          // fetch all the blockLogs in-between `fromBlock` and `toBlock`
          for (let i = fromBlockNumber, l = toBlockNumber + 1; i < l; i++) {
            pendingLogsPromises.push(this.get(Quantity.toBuffer(i)));
          }
        } else {
          // Fetch all the logs from fromBlockNumber to forkBlock in one request
          let addressesAsStrings: String[]|String;
          if (Array.isArray(addresses)){
            addressesAsStrings = addresses.map(x => `0x${x.toString('hex')}`)
          }
          pendingLogsPromises.push(this.getRange(Quantity.from(fromBlockNumber).toString(), Quantity.from(toBlockNumber).toString(), topics, addressesAsStrings ));
          // fetch all the blockLogs in-between `forkBlock` + 1 and `toBlock` locally in the
          // way that we normally do
          for (let i = blockchain.fallback.blockNumber.toNumber() + 1, l = toBlockNumber + 1; i < l; i++) {
            pendingLogsPromises.push(this.get(Quantity.toBuffer(i)));
          }
        }
      } else {
        pendingLogsPromises.push(this.get(Quantity.toBuffer(fromBlockNumber)));
      }

      // now filter and compute all the blocks' blockLogs (in block order)
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
  }
}
