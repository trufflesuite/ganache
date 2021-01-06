import { Quantity } from "@ganache/utils";
import Blockchain from "../blockchain";
import { Address, FilterArgs, RangeFilterArgs } from "@ganache/ethereum-utils";

export function parseFilterDetails(
  filter: Pick<FilterArgs, "address" | "topics">
) {
  // `filter.address` may be a single address or an array
  const addresses = filter.address
    ? (Array.isArray(filter.address)
        ? filter.address
        : [filter.address]
      ).map(a => Address.from(a.toLowerCase()).toBuffer())
    : [];
  const topics = filter.topics ? filter.topics : [];
  return { addresses, topics };
}

export function parseFilterRange(
  filter: Omit<RangeFilterArgs, "address" | "topics">,
  blockchain: Blockchain
) {
  const latestBlock = blockchain.blocks.latest.header.number;
  const fromBlock = blockchain.blocks.getEffectiveNumber(
    filter.fromBlock || "latest"
  );
  const latestBlockNumber = latestBlock.toNumber();
  const toBlock = blockchain.blocks.getEffectiveNumber(
    filter.toBlock || "latest"
  );
  let toBlockNumber: number;
  // don't search after the "latest" block, unless it's "pending", of course.
  if (toBlock > latestBlock) {
    toBlockNumber = latestBlockNumber;
  } else {
    toBlockNumber = toBlock.toNumber();
  }
  return {
    fromBlock,
    toBlock,
    toBlockNumber
  };
}
export function parseFilter(
  filter: RangeFilterArgs = { address: [], topics: [] },
  blockchain: Blockchain
) {
  const { addresses, topics } = parseFilterDetails(filter);
  const { fromBlock, toBlock, toBlockNumber } = parseFilterRange(
    filter,
    blockchain
  );

  return {
    addresses,
    fromBlock,
    toBlock,
    toBlockNumber,
    topics
  };
}
